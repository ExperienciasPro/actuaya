import { Injectable, signal, computed } from '@angular/core';
import {
  WorkOrder,
  OtStatus,
  OtEvidence,
  OtSparePart,
  OtCompletionData,
} from '../models/work-order.model';
import { StorageService } from './storage.service';

// ═══════════════════════════════════════════
// Work Order Service — Técnicos de Campo
// ═══════════════════════════════════════════
// Connects to backend-ot API at /api/ot
// Falls back to localStorage for offline / demo mode.

const API_BASE = 'http://localhost:3500/api/ot';
const MOCK_USER_ID = 'tech-001';

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private readonly OT_KEY = 'um_work_orders';
  private readonly EVIDENCE_KEY = 'um_ot_evidence';
  private readonly PARTS_KEY = 'um_ot_parts';
  private readonly COMPLETION_KEY = 'um_ot_completion';

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
  }

  // ─── API Calls ─────────────────────────────

  async fetchOrders(): Promise<void> {
    try {
      const res = await fetch(API_BASE, {
        headers: {
          'X-User-Id': MOCK_USER_ID,
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
          'X-User-Id': MOCK_USER_ID,
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
      // Offline fallback
      const ot: WorkOrder = {
        id: crypto.randomUUID(),
        title,
        description,
        status: 'abierta',
        assigned_to: null,
        justification_reason: null,
        created_by: MOCK_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this._orders.update(list => [ot, ...list]);
      this.persistOrders();
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
          'X-User-Id': MOCK_USER_ID,
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
      // Offline fallback
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
  }

  removeEvidence(otId: string, evidenceId: string): void {
    this._evidence.update(map => ({
      ...map,
      [otId]: (map[otId] || []).filter(e => e.id !== evidenceId),
    }));
    this.persistEvidence();
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
  }

  removeSparePart(otId: string, partId: string): void {
    this._spareParts.update(map => ({
      ...map,
      [otId]: (map[otId] || []).filter(p => p.id !== partId),
    }));
    this.persistParts();
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
  }

  setSignature(otId: string, dataUrl: string | null): void {
    this._completionData.update(map => ({
      ...map,
      [otId]: { ...(map[otId] || {}), signatureDataUrl: dataUrl },
    }));
    this.persistCompletion();
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
