import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { StorageService } from './storage.service';

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
}

export interface ExpenseRecord {
  id: string;
  concept: string;
  category: string;
  date: string;
  amount: number;
  createdAt: string;
}

export interface HistoricalYear {
  year: number;
  grossIncome: number;
  grossExpenses: number;
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

  private readonly INCOME_KEY = 'um_admin_income';
  private readonly EXPENSE_KEY = 'um_admin_expenses';
  private readonly INVESTMENT_KEY = 'um_admin_investments';
  private readonly HISTORICAL_KEY = 'um_admin_historical';

  // — Signals —
  incomes = signal<IncomeRecord[]>([]);
  expenses = signal<ExpenseRecord[]>([]);
  investments = signal<InvestmentRecord[]>([]);
  historicalYears = signal<HistoricalYear[]>([]);
  dollarRate = signal<number>(4000);

  constructor() {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage(): void {
    this.incomes.set(this.storage.get<IncomeRecord[]>(this.INCOME_KEY) || []);
    this.expenses.set(this.storage.get<ExpenseRecord[]>(this.EXPENSE_KEY) || []);
    this.investments.set(this.storage.get<InvestmentRecord[]>(this.INVESTMENT_KEY) || []);
    this.historicalYears.set(this.loadHistorical());
  }

  private loadHistorical(): HistoricalYear[] {
    return this.storage.get<HistoricalYear[]>(this.HISTORICAL_KEY) || [];
  }

  // — Computed —
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

  // — Income CRUD —
  addIncome(data: Omit<IncomeRecord, 'id' | 'createdAt'>): void {
    const record: IncomeRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this.incomes()];
    this.incomes.set(updated);
    this.storage.set(this.INCOME_KEY, updated);
  }

  deleteIncome(id: string): void {
    const updated = this.incomes().filter(i => i.id !== id);
    this.incomes.set(updated);
    this.storage.set(this.INCOME_KEY, updated);
  }

  updateIncome(id: string, data: Partial<Omit<IncomeRecord, 'id' | 'createdAt'>>): void {
    const updated = this.incomes().map(inc => inc.id === id ? { ...inc, ...data } : inc);
    this.incomes.set(updated);
    this.storage.set(this.INCOME_KEY, updated);
  }

  // — Expense CRUD —
  addExpense(data: Omit<ExpenseRecord, 'id' | 'createdAt'>): void {
    const record: ExpenseRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this.expenses()];
    this.expenses.set(updated);
    this.storage.set(this.EXPENSE_KEY, updated);
  }

  deleteExpense(id: string): void {
    const updated = this.expenses().filter(e => e.id !== id);
    this.expenses.set(updated);
    this.storage.set(this.EXPENSE_KEY, updated);
  }

  // — Investment CRUD —
  addInvestment(data: Omit<InvestmentRecord, 'id' | 'createdAt'>): void {
    const record: InvestmentRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this.investments()];
    this.investments.set(updated);
    this.storage.set(this.INVESTMENT_KEY, updated);
  }

  updateInvestment(id: string, data: Partial<InvestmentRecord>): void {
    const updated = this.investments().map(i => i.id === id ? { ...i, ...data } : i);
    this.investments.set(updated);
    this.storage.set(this.INVESTMENT_KEY, updated);
  }

  deleteInvestment(id: string): void {
    const updated = this.investments().filter(i => i.id !== id);
    this.investments.set(updated);
    this.storage.set(this.INVESTMENT_KEY, updated);
  }

  // — Historical Years —
  saveHistoricalYear(data: HistoricalYear): void {
    const years = this.historicalYears().filter(y => y.year !== data.year);
    const updated = [...years, data].sort((a, b) => a.year - b.year);
    this.historicalYears.set(updated);
    this.storage.set(this.HISTORICAL_KEY, updated);
  }

  deleteHistoricalYear(year: number): void {
    const updated = this.historicalYears().filter(y => y.year !== year);
    this.historicalYears.set(updated);
    this.storage.set(this.HISTORICAL_KEY, updated);
  }
}
