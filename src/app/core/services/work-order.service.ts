import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import {
  WorkOrder,
  OtStatus,
  OtEvidence,
  OtSparePart,
  OtCompletionData,
} from '../models/work-order.model';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { DataSyncService } from './data-sync.service';
import { environment } from '../../../environments/environment';

// ═══════════════════════════════════════════
// Work Order Service — Técnicos de Campo
// ═══════════════════════════════════════════
// Connects to backend-ot API at /api/ot
// Falls back to localStorage for offline / demo mode.
// Fix: Uses real user ID, syncs evidence/signatures via DataSync,
//      and retries offline queue on reconnect.

const API_BASE = `${environment.apiUrl.replace('/data', '')}/ot`;

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private readonly OT_KEY = 'um_work_orders';
  private readonly EVIDENCE_KEY = 'um_ot_evidence';
  private readonly PARTS_KEY = 'um_ot_parts';
  private readonly COMPLETION_KEY = 'um_ot_completion';
  private readonly OFFLINE_QUEUE_KEY = 'um_ot_offline_queue';

  private userService = inject(UserService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;

  /** Lazy-resolve DataSyncService to avoid circular dependency */
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  /** Get the real user ID from the active profile */
  private get userId(): string {
    return this.userService.profile()?.id || 'anonymous';
  }

  // ─── Signals ───
  private _orders = signal<WorkOrder[]>([]);
  orders = this._orders.asReadonly();

  private _activeOt = signal<WorkOrder | null>(null);
  activeOt = this._activeOt.asReadonly();

  private _evidence = signal<Record<string, OtEvidence[]>>({});
  private _spareParts = signal<Record<string, OtSparePart[]>>({});
  private _completionData = signal<Record<string, Partial<OtCompletionData>>>({});

  // ─── Computed ───
  assignedOrders = computed(() =>
    this._orders().filter(o => o.status === 'asignada' || o.status === 'en_camino')
  );

  activeOrders = computed(() =>
    this._orders().filter(o => o.status === 'en_ejecucion' || o.status === 'en_pausa')
  );

  completedOrders = computed(() =>
    this._orders().filter(o => o.status === 'completada' || o.status === 'cerrada')
  );

  constructor(private storage: StorageService) {
    this.loadFromLocalStorage();
    this.fetchOrders(); // Try backend
    this.setupOnlineListener(); // Retry offline queue on reconnect
  }

  // ─── API Calls ─────────────────────────────

  async fetchOrders(): Promise<void> {
    try {
      const res = await fetch(API_BASE, {
        headers: {
          'X-User-Id': this.userId,
          'X-User-Role': 'user',
        },
      });
      if (res.ok) {
        const data = await res.json();
        this._orders.set(data.data || []);
        this.persistOrders();
      }
    } catch {
      // Offline — use localStorage
      console.warn('[OT Service] Backend offline, using localStorage');
    }
  }

  async createOrder(title: string, description: string = ''): Promise<WorkOrder | null> {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-User-Role': 'user',
        },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const data = await res.json();
        this._orders.update(list => [data.data, ...list]);
        this.persistOrders();
        return data.data;
      }
    } catch {
      // Offline fallback — queue for later sync
      const ot: WorkOrder = {
        id: crypto.randomUUID(),
        title,
        description,
        status: 'abierta',
        assigned_to: null,
        justification_reason: null,
        created_by: this.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this._orders.update(list => [ot, ...list]);
      this.persistOrders();
      this.addToOfflineQueue({ action: 'create', data: { title, description } });
      return ot;
    }
    return null;
  }

  async transition(id: string, newStatus: OtStatus, justification?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${id}/transition`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.userId,
          'X-User-Role': 'user',
        },
        body: JSON.stringify({
          status: newStatus,
          justification_reason: justification,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        this._orders.update(list =>
          list.map(o => (o.id === id ? data.data : o))
        );
        if (this._activeOt()?.id === id) {
          this._activeOt.set(data.data);
        }
        this.persistOrders();
        return true;
      }
      const err = await res.json();
      alert(`❌ ${err.error}`);
      return false;
    } catch {
      // Offline fallback — update locally and queue
      this._orders.update(list =>
        list.map(o =>
          o.id === id
            ? { ...o, status: newStatus, justification_reason: justification || null, updated_at: new Date().toISOString() }
            : o
        )
      );
      const updated = this._orders().find(o => o.id === id) || null;
      if (this._activeOt()?.id === id) this._activeOt.set(updated);
      this.persistOrders();
      this.addToOfflineQueue({ action: 'transition', data: { id, status: newStatus, justification } });
      return true;
    }
  }

  // ─── Evidence Management ────────────────────

  getEvidence(otId: string): OtEvidence[] {
    return this._evidence()[otId] || [];
  }

  addEvidence(otId: string, evidence: OtEvidence): void {
    this._evidence.update(map => ({
      ...map,
      [otId]: [...(map[otId] || []), evidence],
    }));
    this.persistEvidence();
    this.syncToServer(); // Push to server immediately
  }

  removeEvidence(otId: string, evidenceId: string): void {
    this._evidence.update(map => ({
      ...map,
      [otId]: (map[otId] || []).filter(e => e.id !== evidenceId),
    }));
    this.persistEvidence();
    this.syncToServer();
  }

  hasRequiredEvidence(otId: string): boolean {
    const ev = this.getEvidence(otId);
    const hasBefore = ev.some(e => e.type === 'photo_before');
    const hasAfter = ev.some(e => e.type === 'photo_after');
    const hasVideo = ev.some(e => e.type === 'video');
    return hasBefore && hasAfter && hasVideo;
  }

  getEvidenceCount(otId: string): { before: number; after: number; video: number } {
    const ev = this.getEvidence(otId);
    return {
      before: ev.filter(e => e.type === 'photo_before').length,
      after: ev.filter(e => e.type === 'photo_after').length,
      video: ev.filter(e => e.type === 'video').length,
    };
  }

  // ─── Spare Parts ───────────────────────────

  getSpareParts(otId: string): OtSparePart[] {
    return this._spareParts()[otId] || [];
  }

  addSparePart(otId: string, part: OtSparePart): void {
    this._spareParts.update(map => ({
      ...map,
      [otId]: [...(map[otId] || []), part],
    }));
    this.persistParts();
    this.syncToServer();
  }

  removeSparePart(otId: string, partId: string): void {
    this._spareParts.update(map => ({
      ...map,
      [otId]: (map[otId] || []).filter(p => p.id !== partId),
    }));
    this.persistParts();
    this.syncToServer();
  }

  getPartsTotalCost(otId: string): number {
    return this.getSpareParts(otId).reduce((sum, p) => sum + p.totalCost, 0);
  }

  // ─── Completion Data ───────────────────────

  setCompletionFindings(otId: string, findings: string): void {
    this._completionData.update(map => ({
      ...map,
      [otId]: { ...(map[otId] || {}), findings },
    }));
    this.persistCompletion();
    this.syncToServer();
  }

  setSignature(otId: string, dataUrl: string | null): void {
    this._completionData.update(map => ({
      ...map,
      [otId]: { ...(map[otId] || {}), signatureDataUrl: dataUrl },
    }));
    this.persistCompletion();
    this.syncToServer();
  }

  getCompletionData(otId: string): Partial<OtCompletionData> {
    return this._completionData()[otId] || {};
  }

  // ─── Active OT ────────────────────────────

  setActive(ot: WorkOrder | null): void {
    this._activeOt.set(ot);
  }

  getById(id: string): WorkOrder | undefined {
    return this._orders().find(o => o.id === id);
  }

  // ─── Sync to Server via DataSync ───────────

  /** Push OT data (evidence, parts, completion) to server via DataSync */
  private syncToServer(): void {
    this.dataSync.trackLocalModification(this.EVIDENCE_KEY);
    this.dataSync.trackLocalModification(this.PARTS_KEY);
    this.dataSync.trackLocalModification(this.COMPLETION_KEY);
    this.dataSync.saveToServerImmediate();
  }

  // ─── Offline Queue ─────────────────────────

  private addToOfflineQueue(entry: { action: string; data: any }): void {
    const queue = this.storage.get<any[]>(this.OFFLINE_QUEUE_KEY) || [];
    queue.push({ ...entry, timestamp: new Date().toISOString() });
    this.storage.set(this.OFFLINE_QUEUE_KEY, queue);
    console.log(`[OT Service] Queued offline action: ${entry.action}`);
  }

  /** Listen for online event and retry queued operations */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('[OT Service] Back online — flushing offline queue');
      this.flushOfflineQueue();
    });
  }

  /** Retry all queued offline operations */
  private async flushOfflineQueue(): Promise<void> {
    const queue = this.storage.get<any[]>(this.OFFLINE_QUEUE_KEY) || [];
    if (queue.length === 0) return;

    console.log(`[OT Service] Flushing ${queue.length} offline operations...`);
    const remaining: any[] = [];

    for (const entry of queue) {
      try {
        let success = false;
        if (entry.action === 'create') {
          const res = await fetch(API_BASE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': this.userId,
              'X-User-Role': 'user',
            },
            body: JSON.stringify(entry.data),
          });
          success = res.ok;
        } else if (entry.action === 'transition') {
          const res = await fetch(`${API_BASE}/${entry.data.id}/transition`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': this.userId,
              'X-User-Role': 'user',
            },
            body: JSON.stringify({
              status: entry.data.status,
              justification_reason: entry.data.justification,
            }),
          });
          success = res.ok;
        }

        if (!success) {
          remaining.push(entry);
        }
      } catch {
        remaining.push(entry); // Still offline or server error
      }
    }

    this.storage.set(this.OFFLINE_QUEUE_KEY, remaining);
    if (remaining.length === 0) {
      console.log('[OT Service] All offline operations synced successfully.');
    } else {
      console.warn(`[OT Service] ${remaining.length} operations still pending.`);
    }

    // Also push evidence/completion data to server
    this.syncToServer();
    // Refresh orders from server
    await this.fetchOrders();
  }

  // ─── Persistence ───────────────────────────

  private loadFromLocalStorage(): void {
    const orders = this.storage.get<WorkOrder[]>(this.OT_KEY);
    if (orders) this._orders.set(orders);

    const evidence = this.storage.get<Record<string, OtEvidence[]>>(this.EVIDENCE_KEY);
    if (evidence) this._evidence.set(evidence);

    const parts = this.storage.get<Record<string, OtSparePart[]>>(this.PARTS_KEY);
    if (parts) this._spareParts.set(parts);

    const completion = this.storage.get<Record<string, Partial<OtCompletionData>>>(this.COMPLETION_KEY);
    if (completion) this._completionData.set(completion);
  }

  private persistOrders(): void {
    this.storage.set(this.OT_KEY, this._orders());
  }

  private persistEvidence(): void {
    this.storage.set(this.EVIDENCE_KEY, this._evidence());
  }

  private persistParts(): void {
    this.storage.set(this.PARTS_KEY, this._spareParts());
  }

  private persistCompletion(): void {
    this.storage.set(this.COMPLETION_KEY, this._completionData());
  }
}
