import { Injectable, signal, computed, effect } from '@angular/core';
import {
  Transaction,
  TransactionType,
  CashflowSummary,
} from '../models/cashflow.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CashflowService {
  private readonly STORAGE_KEY = 'um_cashflow';

  private _transactions = signal<Transaction[]>([]);
  transactions = this._transactions.asReadonly();

  /** Month filter: YYYY-MM string (e.g. '2026-03') */
  activeMonth = signal<string>(this.getCurrentMonth());

  /** Filtered transactions for the active month */
  monthTransactions = computed(() => {
    const month = this.activeMonth();
    return this._transactions().filter(t => t.date.startsWith(month));
  });

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
  }

  // ─── CRUD ───────────────────────────────

  add(tx: Omit<Transaction, 'id' | 'createdAt'>): void {
    const newTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this._transactions.update(list => [newTx, ...list]);
    this.persist();
  }

  remove(id: string): void {
    this._transactions.update(list => list.filter(t => t.id !== id));
    this.persist();
  }

  update(id: string, changes: Partial<Transaction>): void {
    this._transactions.update(list =>
      list.map(t => (t.id === id ? { ...t, ...changes } : t))
    );
    this.persist();
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

  private getCurrentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private offsetMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private load(): void {
    const saved = this.storage.get<Transaction[]>(this.STORAGE_KEY);
    if (saved) {
      this._transactions.set(saved);
    }
  }

  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this._transactions());
  }
}
