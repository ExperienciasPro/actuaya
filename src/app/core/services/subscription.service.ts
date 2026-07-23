import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './storage.service';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionType,
  AppSolution,
  PaymentFrequency,
  PAYMENT_FREQUENCY_MONTHS,
  RenewalHealth,
  Currency,
} from '../models/subscription.model';
import { environment } from '../../../environments/environment';

// ═══════════════════════════════════════════
// Subscription Service — CRUD + Business Logic
// ═══════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'um_subscriptions';
  private readonly API_URL = `${environment.apiUrl}/data`;
  private readonly AUTH_TOKEN = environment.authToken;

  // — Reactive Signal —
  subscriptions = signal<Subscription[]>(
    this.loadFromLocal()
  );

  constructor() {
    // Cargar desde el servidor en background y mergear
    this.syncFromServer();
  }

  /** Carga rápida desde localStorage */
  private loadFromLocal(): Subscription[] {
    const stored = this.storage.get<Subscription[]>(this.STORAGE_KEY);
    return (stored && stored.length > 0) ? stored : [];
  }

  /** Sincroniza datos desde el servidor (en background) */
  private async syncFromServer(): Promise<void> {
    try {
      console.log('[SYNC] Leyendo desde:', `${this.API_URL}?key=subscriptions`);
      const response = await fetch(`${this.API_URL}?key=subscriptions`, {
        headers: { 'X-Auth-Token': this.AUTH_TOKEN },
      });
      console.log('[SYNC] Response status:', response.status);
      if (!response.ok) return;

      const serverData: Subscription[] = await response.json();
      console.log('[SYNC] Datos del servidor:', serverData.length, 'registros');
      if (!Array.isArray(serverData) || serverData.length === 0) {
        // Servidor vacío — subir datos locales al servidor
        const local = this.subscriptions();
        if (local.length > 0) {
          console.log('[SYNC] Servidor vacío, subiendo', local.length, 'registros locales');
          this.saveToServer(local);
        }
        return;
      }

      // Merge: priorizar el que tenga más datos o más reciente
      const local = this.subscriptions();
      const merged = this.mergeSubscriptions(local, serverData);

      if (merged.length !== local.length) {
        this.subscriptions.set(merged);
        this.storage.set(this.STORAGE_KEY, merged);
      }
    } catch (e) {
      // Servidor no disponible — seguir con localStorage
      console.warn('[SYNC] API no disponible:', e);
    }
  }

  /** Mergea dos arrays de suscripciones sin duplicar (por ID) */
  private mergeSubscriptions(a: Subscription[], b: Subscription[]): Subscription[] {
    const map = new Map<string, Subscription>();
    // Primero las del servidor (base)
    for (const s of b) map.set(s.id, s);
    // Luego las locales (sobreescriben si tienen updatedAt más reciente)
    for (const s of a) {
      const existing = map.get(s.id);
      if (!existing) {
        map.set(s.id, s);
      } else if (s.updatedAt && existing.updatedAt && s.updatedAt > existing.updatedAt) {
        map.set(s.id, s);
      }
    }
    return Array.from(map.values());
  }

  // — Computed Stats —
  totalSubscriptions = computed(() => this.subscriptions().length);

  activeCount = computed(
    () => this.subscriptions().filter(s => s.status === SubscriptionStatus.ACTIVE).length
  );

  expiredCount = computed(
    () => this.subscriptions().filter(s => s.status === SubscriptionStatus.EXPIRED).length
  );

  trialCount = computed(
    () => this.subscriptions().filter(s => s.status === SubscriptionStatus.TRIAL).length
  );

  suspendedCount = computed(
    () => this.subscriptions().filter(s => s.status === SubscriptionStatus.SUSPENDED).length
  );

  urgentRenewals = computed(
    () => this.subscriptions().filter(s => {
      const health = this.calculateRenewalHealth(s.nextRenewalDate);
      return health.isUrgent && s.status === SubscriptionStatus.ACTIVE;
    }).length
  );

  /** Calcula el ingreso mensual normalizado de una suscripción */
  private monthlyAmount(s: Subscription): number {
    const freq = s.paymentFrequency || PaymentFrequency.MONTHLY;
    const months = PAYMENT_FREQUENCY_MONTHS[freq] || 1;
    return s.amount / months;
  }

  /** Ingreso mensual normalizado en COP */
  totalRevenueCOP = computed(
    () => this.subscriptions()
      .filter(s => s.currency === 'COP' && s.status !== SubscriptionStatus.SUSPENDED)
      .reduce((sum, s) => sum + this.monthlyAmount(s), 0)
  );

  /** Ingreso mensual normalizado en USD */
  totalRevenueUSD = computed(
    () => this.subscriptions()
      .filter(s => s.currency === 'USD' && s.status !== SubscriptionStatus.SUSPENDED)
      .reduce((sum, s) => sum + this.monthlyAmount(s), 0)
  );

  /** Suma bruta de pagos COP (sin normalizar — lo que el cliente realmente paga) */
  totalCollectedCOP = computed(
    () => this.subscriptions()
      .filter(s => s.currency === 'COP' && s.status !== SubscriptionStatus.SUSPENDED)
      .reduce((sum, s) => sum + s.amount, 0)
  );

  /** Suma bruta de pagos USD */
  totalCollectedUSD = computed(
    () => this.subscriptions()
      .filter(s => s.currency === 'USD' && s.status !== SubscriptionStatus.SUSPENDED)
      .reduce((sum, s) => sum + s.amount, 0)
  );

  subscriptionsByApp = computed(() => {
    const map = new Map<AppSolution, number>();
    for (const sub of this.subscriptions()) {
      map.set(sub.app, (map.get(sub.app) || 0) + 1);
    }
    return map;
  });

  // ─── CRUD Operations ──────────────────────

  getAll(): Subscription[] {
    return this.subscriptions();
  }

  getById(id: string): Subscription | undefined {
    return this.subscriptions().find(s => s.id === id);
  }

  create(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Subscription {
    const record: Subscription = {
      ...data,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this.subscriptions()];
    this.persist(updated);
    return record;
  }

  update(id: string, changes: Partial<Subscription>): void {
    const updated = this.subscriptions().map(s =>
      s.id === id ? { ...s, ...changes, updatedAt: new Date().toISOString() } : s
    );
    this.persist(updated);
  }

  delete(id: string): void {
    const updated = this.subscriptions().filter(s => s.id !== id);
    this.subscriptions.set(updated);
    this.storage.set(this.STORAGE_KEY, updated);
    // Send deletion marker to server so merge logic removes the record
    this.sendDeletionToServer(id);
    // Also save the full list
    this.saveToServer(updated);
  }

  /** Sends a _deleted marker so the server's merge logic removes the record */
  private async sendDeletionToServer(id: string): Promise<void> {
    try {
      await fetch(`${this.API_URL}?key=subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.AUTH_TOKEN,
        },
        body: JSON.stringify([{ id, _deleted: true }]),
      });
    } catch (e) {
      console.warn('[SAVE] Error enviando eliminación:', e);
    }
  }

  /** Reemplaza todas las suscripciones (usado por import/restore) */
  replaceAll(data: Subscription[]): void {
    this.persist(data);
  }

  // ─── Business Logic ───────────────────────

  /**
   * Calcula la salud de renovación basándose en la fecha de próxima renovación.
   * Determina si está a menos de 15 días de vencer, si es crítico (< 5 días) o si ya venció.
   */
  calculateRenewalHealth(nextRenewalDate: string): RenewalHealth {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const renewal = new Date(nextRenewalDate);
    renewal.setHours(0, 0, 0, 0);

    const diffMs = renewal.getTime() - now.getTime();
    const daysUntilRenewal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const isOverdue = daysUntilRenewal < 0;
    const isCritical = daysUntilRenewal >= 0 && daysUntilRenewal <= 5;
    const isUrgent = daysUntilRenewal >= 0 && daysUntilRenewal <= 15;

    let label: string;
    if (isOverdue) {
      label = `Venció hace ${Math.abs(daysUntilRenewal)} día(s)`;
    } else if (isCritical) {
      label = `¡Crítico! ${daysUntilRenewal} día(s)`;
    } else if (isUrgent) {
      label = `Urgente: ${daysUntilRenewal} día(s)`;
    } else {
      label = `${daysUntilRenewal} días`;
    }

    return { daysUntilRenewal, isUrgent, isCritical, isOverdue, label };
  }

  /** Filtra suscripciones por app y/o estado */
  getFiltered(appFilter?: AppSolution | null, statusFilter?: SubscriptionStatus | null): Subscription[] {
    return this.subscriptions().filter(s => {
      const matchApp = !appFilter || s.app === appFilter;
      const matchStatus = !statusFilter || s.status === statusFilter;
      return matchApp && matchStatus;
    });
  }

  // ─── Internal ─────────────────────────

  private persist(data: Subscription[]): void {
    this.subscriptions.set(data);
    this.storage.set(this.STORAGE_KEY, data);
    // Guardar en el servidor tambien (fire & forget)
    this.saveToServer(data);
  }

  private async saveToServer(data: Subscription[]): Promise<void> {
    try {
      console.log('[SAVE] Guardando', data.length, 'registros en:', `${this.API_URL}?key=subscriptions`);
      const response = await fetch(`${this.API_URL}?key=subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.AUTH_TOKEN,
        },
        body: JSON.stringify(data),
      });
      const result = await response.text();
      console.log('[SAVE] Respuesta:', response.status, result);
    } catch (e) {
      // Servidor no disponible — datos ya están en localStorage
      console.warn('[SAVE] Error guardando:', e);
    }
  }

  private generateId(): string {
    return 'sub-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

}
