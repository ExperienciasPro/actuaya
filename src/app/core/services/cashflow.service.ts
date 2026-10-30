import { Injectable, signal, computed, effect, Injector, inject, untracked } from '@angular/core';
import {
  Transaction,
  TransactionType,
  CashflowSummary,
  RecurringExpense,
  RecurringExpenseSettings,
  getRecurringType,
} from '../models/cashflow.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

export type RecurringMonthStatus = 'registered' | 'pending' | 'scheduled' | 'paused';

@Injectable({ providedIn: 'root' })
export class CashflowService {
  private readonly STORAGE_KEY = 'um_cashflow';
  private readonly RECURRING_KEY = 'um_cashflow_recurring';
  private readonly RECURRING_SETTINGS_KEY = 'um_cashflow_recurring_settings';

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private _transactions = signal<Transaction[]>([]);
  transactions = this._transactions.asReadonly();

  // ─── Egresos básicos mensuales ──────────
  private _recurring = signal<RecurringExpense[]>([]);
  private _recurringSettings = signal<RecurringExpenseSettings>({ autoApply: false });
  recurringSettings = this._recurringSettings.asReadonly();

  /** Todos los conceptos recurrentes vigentes (ingresos y egresos), ordenados por día */
  recurringItems = computed(() =>
    this._recurring()
      .filter(r => !r.isDeleted)
      .sort((a, b) => (a.dayOfMonth - b.dayOfMonth) || a.name.localeCompare(b.name, 'es'))
  );

  /** Egresos básicos vigentes (no eliminados), ordenados por día de pago */
  recurringExpenses = computed(() => this.recurringItems().filter(r => getRecurringType(r) === 'egreso'));

  /** Ingresos básicos vigentes (ej. arriendos recibidos), ordenados por día de cobro */
  recurringIncomes = computed(() => this.recurringItems().filter(r => getRecurringType(r) === 'ingreso'));

  /** Total mensual de egresos básicos activos */
  monthlyBasicTotal = computed(() =>
    this.recurringExpenses()
      .filter(r => r.active)
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  );

  /** Total mensual de ingresos básicos activos */
  monthlyBasicIncomeTotal = computed(() =>
    this.recurringIncomes()
      .filter(r => r.active)
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  );

  /** Diferencia mensual: positivo = dinero extra que se debe conseguir; negativo = excedente */
  monthlyBasicGap = computed(() => this.monthlyBasicTotal() - this.monthlyBasicIncomeTotal());

  /** Month filter: YYYY-MM string (e.g. '2026-03') */
  activeMonth = signal<string>(this.getCurrentMonth());

  /** Filtered transactions for the active month */
  monthTransactions = computed(() => {
    const month = this.activeMonth();
    return this._transactions().filter(t => !t.isDeleted && t.date.startsWith(month));
  });

  /** Movimientos del mes activo originados por conceptos básicos (recurringExpenseId → movimiento) */
  recurringMonthTransactions = computed(() => {
    const map = new Map<string, Transaction>();
    for (const tx of this.monthTransactions()) {
      if (tx.recurringExpenseId && !map.has(tx.recurringExpenseId)) {
        map.set(tx.recurringExpenseId, tx);
      }
    }
    return map;
  });

  /** Total ya registrado en el mes activo por concepto de egresos básicos */
  recurringRegisteredTotal = computed(() => this.sumRegistered('egreso'));

  /** Total ya registrado en el mes activo por concepto de ingresos básicos */
  recurringIncomeRegisteredTotal = computed(() => this.sumRegistered('ingreso'));

  /** Summary for active month — only COP transactions (primary currency) */
  summary = computed<CashflowSummary>(() => {
    const txs = this.monthTransactions();
    // Only sum transactions in COP (or without currency, which defaults to COP)
    const copTxs = txs.filter(t => !t.currency || t.currency === 'COP');
    const totalIngresos = copTxs
      .filter(t => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalEgresos = copTxs
      .filter(t => t.type === 'egreso')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
      transactionCount: copTxs.length,
    };
  });

  /** Separate summary for USD transactions */
  summaryUSD = computed<CashflowSummary>(() => {
    const txs = this.monthTransactions().filter(t => t.currency === 'USD');
    const totalIngresos = txs
      .filter(t => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalEgresos = txs
      .filter(t => t.type === 'egreso')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
      transactionCount: txs.length,
    };
  });

  constructor(private storage: StorageService) {
    this.load();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.load();
      }
    });

    // Registro automático de egresos básicos del mes en curso cuando llega su día de pago.
    // Solo se ejecuta tras la sincronización inicial para no bloquear la hidratación del servidor.
    effect(() => {
      const settings = this._recurringSettings();
      this._recurring();
      this._transactions();
      if (!settings.autoApply) return;
      untracked(() => {
        if (!this.dataSync.isInitialSyncDone) return;
        this.autoApplyDueRecurring();
      });
    });
  }

  // ─── CRUD ───────────────────────────────

  add(tx: Omit<Transaction, 'id' | 'createdAt'>): void {
    const newTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this._transactions.update(list => [newTx, ...list]);
    this.persist();
  }

  remove(id: string): void {
    this._transactions.update(list => 
      list.map(t => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t)
    );
    this.persist();
    this.dataSync.saveToServerImmediate(); // Prioridad para borrados
  }

  update(id: string, changes: Partial<Transaction>): void {
    this._transactions.update(list =>
      list.map(t => (t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t))
    );
    this.persist();
  }

  // ─── Egresos básicos: CRUD ──────────────

  addRecurring(data: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): RecurringExpense {
    const now = new Date().toISOString();
    const item: RecurringExpense = {
      ...data,
      name: data.name.trim(),
      dayOfMonth: this.normalizeDay(data.dayOfMonth),
      amount: Math.max(0, Number(data.amount) || 0),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this._recurring.update(list => [...list, item]);
    this.persistRecurring();
    return item;
  }

  updateRecurring(id: string, changes: Partial<RecurringExpense>): void {
    const now = new Date().toISOString();
    this._recurring.update(list =>
      list.map(r => {
        if (r.id !== id) return r;
        const next: RecurringExpense = { ...r, ...changes, id: r.id, updatedAt: now };
        if (changes.dayOfMonth !== undefined) next.dayOfMonth = this.normalizeDay(changes.dayOfMonth);
        if (changes.amount !== undefined) next.amount = Math.max(0, Number(changes.amount) || 0);
        if (changes.name !== undefined) next.name = changes.name.trim();
        return next;
      })
    );
    this.persistRecurring();
  }

  /** Elimina el concepto (soft delete). Los movimientos ya registrados en meses anteriores se conservan. */
  removeRecurring(id: string): void {
    const now = new Date().toISOString();
    this._recurring.update(list =>
      list.map(r => (r.id === id ? { ...r, isDeleted: true, active: false, updatedAt: now } : r))
    );
    this.persistRecurring();
    this.dataSync.saveToServerImmediate();
  }

  setRecurringAutoApply(autoApply: boolean): void {
    this._recurringSettings.set({ autoApply, updatedAt: new Date().toISOString() });
    this.storage.set(this.RECURRING_SETTINGS_KEY, this._recurringSettings());
    this.dataSync.trackLocalModification(this.RECURRING_SETTINGS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  // ─── Egresos básicos: registro en el flujo ─

  /** Estado de un egreso básico frente a un mes (YYYY-MM) */
  getRecurringStatus(item: RecurringExpense, month: string = this.activeMonth()): RecurringMonthStatus {
    const registered = month === this.activeMonth()
      ? this.recurringMonthTransactions().has(item.id)
      : this.findRecurringTx(item.id, month, false) !== undefined;
    if (registered) return 'registered';
    if (!item.active) return 'paused';
    const current = this.getCurrentMonth();
    if (month > current) return 'scheduled';
    if (month < current) return 'pending';
    const today = new Date().getDate();
    return today >= this.resolveDay(item.dayOfMonth, month) ? 'pending' : 'scheduled';
  }

  /** Fecha efectiva de pago (ajustada a la longitud del mes) */
  getRecurringDate(item: RecurringExpense, month: string = this.activeMonth()): string {
    const day = this.resolveDay(item.dayOfMonth, month);
    return `${month}-${String(day).padStart(2, '0')}`;
  }

  /** Registra (o reactiva) el egreso básico como movimiento del mes indicado */
  registerRecurring(id: string, month: string = this.activeMonth()): boolean {
    const item = this._recurring().find(r => r.id === id && !r.isDeleted);
    if (!item || !(item.amount > 0)) return false;
    if (this.findRecurringTx(item.id, month, false)) return false;

    this._transactions.update(list => this.upsertRecurringTx(list, item, month));
    this.persist();
    return true;
  }

  /** Registra todos los conceptos básicos activos pendientes del mes indicado (de un tipo o de ambos) */
  registerAllPendingRecurring(month: string = this.activeMonth(), type?: TransactionType): number {
    const pending = this.recurringItems().filter(
      r => (!type || getRecurringType(r) === type) &&
        r.active && r.amount > 0 && !this.findRecurringTx(r.id, month, false)
    );
    if (pending.length === 0) return 0;
    this._transactions.update(list => pending.reduce((acc, item) => this.upsertRecurringTx(acc, item, month), list));
    this.persist();
    return pending.length;
  }

  /**
   * Registro automático: para el mes en curso, crea los movimientos de egresos básicos
   * cuyo día de pago ya llegó. Respeta los que el usuario eliminó manualmente ese mes.
   */
  autoApplyDueRecurring(): number {
    const month = this.getCurrentMonth();
    const today = new Date().getDate();
    const due = this._recurring().filter(r =>
      !r.isDeleted &&
      r.active &&
      r.amount > 0 &&
      today >= this.resolveDay(r.dayOfMonth, month) &&
      // Incluye eliminados: si el usuario lo borró este mes, no se vuelve a crear solo
      !this.findRecurringTx(r.id, month, true)
    );
    if (due.length === 0) return 0;
    this._transactions.update(list => due.reduce((acc, item) => this.upsertRecurringTx(acc, item, month), list));
    this.persist();
    return due.length;
  }

  // ─── Navigation ─────────────────────────

  goToPreviousMonth(): void {
    this.activeMonth.update(m => this.offsetMonth(m, -1));
  }

  goToNextMonth(): void {
    this.activeMonth.update(m => this.offsetMonth(m, 1));
  }

  setMonth(month: string): void {
    this.activeMonth.set(month);
  }

  // ─── Helpers ────────────────────────────

  getCurrentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private offsetMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private normalizeDay(day: number): number {
    const n = Math.round(Number(day) || 1);
    return Math.min(31, Math.max(1, n));
  }

  private resolveDay(day: number, month: string): number {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return Math.min(this.normalizeDay(day), lastDay);
  }

  private sumRegistered(type: TransactionType): number {
    let total = 0;
    for (const tx of this.recurringMonthTransactions().values()) {
      if (tx.type === type) total += tx.amount;
    }
    return total;
  }

  private recurringTxId(expenseId: string, month: string): string {
    return `rec-${expenseId}-${month}`;
  }

  private findRecurringTx(expenseId: string, month: string, includeDeleted: boolean): Transaction | undefined {
    const txId = this.recurringTxId(expenseId, month);
    return this._transactions().find(t =>
      (includeDeleted || !t.isDeleted) &&
      (t.id === txId || (t.recurringExpenseId === expenseId && t.date.startsWith(month)))
    );
  }

  /** Inserta el movimiento con ID determinístico (evita duplicados entre dispositivos) o lo reactiva si fue borrado */
  private upsertRecurringTx(list: Transaction[], item: RecurringExpense, month: string): Transaction[] {
    const now = new Date().toISOString();
    const txId = this.recurringTxId(item.id, month);
    const payload = {
      type: getRecurringType(item),
      category: item.category,
      description: item.name,
      amount: item.amount,
      currency: 'COP',
      date: this.getRecurringDate(item, month),
      notes: item.notes || undefined,
      recurringExpenseId: item.id,
    };
    const existingIdx = list.findIndex(t => t.id === txId);
    if (existingIdx >= 0) {
      const next = [...list];
      next[existingIdx] = { ...next[existingIdx], ...payload, isDeleted: false, updatedAt: now };
      return next;
    }
    return [{ ...payload, id: txId, createdAt: now, updatedAt: now }, ...list];
  }

  private load(): void {
    const saved = this.storage.get<Transaction[]>(this.STORAGE_KEY);
    if (saved) {
      this._transactions.set(saved);
    }
    const recurring = this.storage.get<RecurringExpense[]>(this.RECURRING_KEY);
    if (Array.isArray(recurring)) {
      this._recurring.set(recurring);
    }
    const settings = this.storage.get<RecurringExpenseSettings>(this.RECURRING_SETTINGS_KEY);
    if (settings && typeof settings === 'object') {
      this._recurringSettings.set({ autoApply: !!settings.autoApply, updatedAt: settings.updatedAt });
    }
  }

  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this._transactions());
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistRecurring(): void {
    this.storage.set(this.RECURRING_KEY, this._recurring());
    this.dataSync.trackLocalModification(this.RECURRING_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
