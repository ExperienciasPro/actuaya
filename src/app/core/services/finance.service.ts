import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

// ═══════════════════════════════════════════
//  MODELS
// ═══════════════════════════════════════════

export interface IncomeRecord {
  id: string;
  company: string;
  concept: string;
  date: string;       // YYYY-MM-DD
  amount: number;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface ExpenseRecord {
  id: string;
  concept: string;
  category: string;
  date: string;
  amount: number;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface HistoricalYear {
  year: number;
  grossIncome: number;
  grossExpenses: number;
  updatedAt?: string;
  isDeleted?: boolean;
}

export type InvestmentType = 'stocks' | 'fixed_income' | 'real_estate' | 'other' | 'custom' | string;

export interface InvestmentRecord {
  id: string;
  name: string;
  type: InvestmentType;
  purchaseDate: string;
  amount: number;          // Amount invested
  currentValue: number;    // Current value
  currency: 'COP' | 'USD';
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════

export const COMPANIES = [
  'EXPERIENCIAS PRO',
  'YRAKA',
  'DIGIOBRA',
  'TOMA INVERSIÓN',
  'FINCA RAIZ',
  'CONSULTORIAS',
] as const;

export const DIVIDEND_COMPANIES = ['EXPERIENCIAS PRO', 'YRAKA'];

export const EXPENSE_CATEGORIES = [
  'Operación',
  'Impuestos',
  'Nómina',
  'Servicios',
  'Marketing',
  'Tecnología',
  'Otros',
] as const;

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'stocks', label: 'Renta Variable (Acciones)' },
  { value: 'fixed_income', label: 'Renta Fija' },
  { value: 'real_estate', label: 'Finca Raíz' },
  { value: 'other', label: 'Otros' },
  { value: 'custom', label: 'Personalizada...' },
];

// ═══════════════════════════════════════════
//  SERVICE
// ═══════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private storage = inject(StorageService);
  private dataSync = inject(DataSyncService);

  private readonly INCOME_KEY = 'um_admin_income';
  private readonly EXPENSE_KEY = 'um_admin_expenses';
  private readonly INVESTMENT_KEY = 'um_admin_investments';
  private readonly HISTORICAL_KEY = 'um_admin_historical';

  // — Signals —
  private _incomes = signal<IncomeRecord[]>([]);
  private _expenses = signal<ExpenseRecord[]>([]);
  private _investments = signal<InvestmentRecord[]>([]);
  private _historicalYears = signal<HistoricalYear[]>([]);
  
  dollarRate = signal<number>(4000);

  // — Public Computeds (filtered for soft deletes) —
  incomes = computed(() => this._incomes().filter(i => !i.isDeleted));
  expenses = computed(() => this._expenses().filter(e => !e.isDeleted));
  investments = computed(() => this._investments().filter(i => !i.isDeleted));
  historicalYears = computed(() => this._historicalYears().filter(h => !h.isDeleted));

  constructor() {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage(): void {
    this._incomes.set(this.storage.get<IncomeRecord[]>(this.INCOME_KEY) || []);
    this._expenses.set(this.storage.get<ExpenseRecord[]>(this.EXPENSE_KEY) || []);
    this._investments.set(this.storage.get<InvestmentRecord[]>(this.INVESTMENT_KEY) || []);
    this._historicalYears.set(this.storage.get<HistoricalYear[]>(this.HISTORICAL_KEY) || []);
  }

  // — Computed Metrics —
  totalIncome = computed(() => {
    const fromRecords = this.incomes().reduce((s, i) => s + i.amount, 0);
    const recordYears = new Set(this.incomes().map(i => Number(i.date.substring(0, 4))));
    const fromHistory = this.historicalYears()
      .filter(h => !recordYears.has(h.year))
      .reduce((s, h) => s + h.grossIncome, 0);
    return fromRecords + fromHistory;
  });

  totalExpenses = computed(() => {
    const fromRecords = this.expenses().reduce((s, e) => s + e.amount, 0);
    const recordYears = new Set(this.expenses().map(e => Number(e.date.substring(0, 4))));
    const fromHistory = this.historicalYears()
      .filter(h => !recordYears.has(h.year))
      .reduce((s, h) => s + h.grossExpenses, 0);
    return fromRecords + fromHistory;
  });

  netIncome = computed(() => this.totalIncome() - this.totalExpenses());
  
  totalInvested = computed(() => this.investments().reduce((s, i) => {
    const amount = i.currency === 'USD' ? i.amount * this.dollarRate() : i.amount;
    return s + amount;
  }, 0));
  
  totalCurrentValue = computed(() => this.investments().reduce((s, i) => {
    const value = i.currency === 'USD' ? i.currentValue * this.dollarRate() : i.currentValue;
    return s + value;
  }, 0));

  incomeByMonth = computed(() => {
    const map = new Map<string, number>();
    for (const inc of this.incomes()) {
      const key = inc.date.substring(0, 7); // YYYY-MM
      map.set(key, (map.get(key) || 0) + inc.amount);
    }
    return map;
  });

  incomeByCompany = computed(() => {
    const map = new Map<string, number>();
    for (const inc of this.incomes()) {
      map.set(inc.company, (map.get(inc.company) || 0) + inc.amount);
    }
    return map;
  });

  investmentsByType = computed(() => {
    const map = new Map<InvestmentType, number>();
    for (const inv of this.investments()) {
      const value = inv.currency === 'USD' ? inv.currentValue * this.dollarRate() : inv.currentValue;
      map.set(inv.type, (map.get(inv.type) || 0) + value);
    }
    return map;
  });

  // — Persistence Helpers —
  private persistIncomes(): void {
    this.storage.set(this.INCOME_KEY, this._incomes());
    this.dataSync.trackLocalModification(this.INCOME_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistExpenses(): void {
    this.storage.set(this.EXPENSE_KEY, this._expenses());
    this.dataSync.trackLocalModification(this.EXPENSE_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistInvestments(): void {
    this.storage.set(this.INVESTMENT_KEY, this._investments());
    this.dataSync.trackLocalModification(this.INVESTMENT_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistHistorical(): void {
    this.storage.set(this.HISTORICAL_KEY, this._historicalYears());
    this.dataSync.trackLocalModification(this.HISTORICAL_KEY);
    this.dataSync.saveToServerDebounced();
  }

  // — Income CRUD —
  addIncome(data: Omit<IncomeRecord, 'id' | 'createdAt'>): void {
    const record: IncomeRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this._incomes.update(list => [record, ...list]);
    this.persistIncomes();
  }

  updateIncome(id: string, data: Partial<Omit<IncomeRecord, 'id' | 'createdAt'>>): void {
    this._incomes.update(list => list.map(inc => 
      inc.id === id ? { ...inc, ...data, updatedAt: new Date().toISOString() } : inc
    ));
    this.persistIncomes();
  }

  deleteIncome(id: string): void {
    this._incomes.update(list => list.map(inc => 
      inc.id === id ? { ...inc, isDeleted: true, updatedAt: new Date().toISOString() } : inc
    ));
    this.persistIncomes();
    this.dataSync.saveToServerImmediate(); // Priority sync for deletions
  }

  // — Expense CRUD —
  addExpense(data: Omit<ExpenseRecord, 'id' | 'createdAt'>): void {
    const record: ExpenseRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this._expenses.update(list => [record, ...list]);
    this.persistExpenses();
  }

  deleteExpense(id: string): void {
    this._expenses.update(list => list.map(e => 
      e.id === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e
    ));
    this.persistExpenses();
    this.dataSync.saveToServerImmediate();
  }

  // — Investment CRUD —
  addInvestment(data: Omit<InvestmentRecord, 'id' | 'createdAt'>): void {
    const record: InvestmentRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this._investments.update(list => [record, ...list]);
    this.persistInvestments();
  }

  updateInvestment(id: string, data: Partial<InvestmentRecord>): void {
    this._investments.update(list => list.map(i => 
      i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i
    ));
    this.persistInvestments();
  }

  deleteInvestment(id: string): void {
    this._investments.update(list => list.map(i => 
      i.id === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i
    ));
    this.persistInvestments();
    this.dataSync.saveToServerImmediate();
  }

  // — Historical Years —
  saveHistoricalYear(data: HistoricalYear): void {
    this._historicalYears.update(years => {
      const filtered = years.filter(y => y.year !== data.year);
      return [...filtered, { ...data, updatedAt: new Date().toISOString() }].sort((a, b) => a.year - b.year);
    });
    this.persistHistorical();
  }

  deleteHistoricalYear(year: number): void {
    this._historicalYears.update(years => years.map(y => 
      y.year === year ? { ...y, isDeleted: true, updatedAt: new Date().toISOString() } : y
    ));
    this.persistHistorical();
    this.dataSync.saveToServerImmediate();
  }
}
