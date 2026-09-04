import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
import { DataSyncService } from './data-sync.service';
import { StorageService } from './storage.service';

// ═══════════════════════════════════════════
//  MODELS
// ═══════════════════════════════════════════

export type EducationProgramType = 'course' | 'workshop' | 'diploma' | 'conference' | 'other';

export interface EducationalProgram { isDeleted?: boolean;
  id: string;
  name: string;
  type: EducationProgramType;
  status: 'active' | 'completed';
  createdAt: string;
  description?: string;
  website?: string;
}

export interface ProgramIncome { isDeleted?: boolean;
  id: string;
  programId: string;
  type: 'per_person' | 'global';
  amount: number; // Total amount collected
  attendeesCount?: number; // Optional
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
}

export interface ProgramExpense { isDeleted?: boolean;
  id: string;
  programId: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════

export const EDUCATION_PROGRAM_TYPES: { value: EducationProgramType; label: string }[] = [
  { value: 'course', label: 'Curso' },
  { value: 'workshop', label: 'Taller' },
  { value: 'diploma', label: 'Diplomado' },
  { value: 'conference', label: 'Conferencia' },
  { value: 'other', label: 'Otro' },
];

export const EDUCATION_EXPENSE_CATEGORIES = [
  'Materiales / Papelería',
  'Pago Docente',
  'Alquiler de Espacio',
  'Publicidad / Marketing',
  'Refrigerios',
  'Plataformas / Tecnología',
  'Otros'
];

@Injectable({ providedIn: 'root' })
export class EducationService {
  private storage = inject(StorageService);

  private readonly PROGRAMS_KEY = 'um_admin_edu_programs';
  private readonly INCOMES_KEY = 'um_admin_edu_incomes';
  private readonly EXPENSES_KEY = 'um_admin_edu_expenses';

  private _programsSignal = signal<EducationalProgram[]>([]);
  private _incomesSignal = signal<ProgramIncome[]>([]);
  private _expensesSignal = signal<ProgramExpense[]>([]);
  programs = computed(() => this._programsSignal().filter(p => !p.isDeleted));
  incomes = computed(() => this._incomesSignal().filter(i => !i.isDeleted));
  expenses = computed(() => this._expensesSignal().filter(e => !e.isDeleted));

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  constructor() {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage(): void {
    this._programsSignal.set(this.storage.get<EducationalProgram[]>(this.PROGRAMS_KEY) || []);
    this._incomesSignal.set(this.storage.get<ProgramIncome[]>(this.INCOMES_KEY) || []);
    this._expensesSignal.set(this.storage.get<ProgramExpense[]>(this.EXPENSES_KEY) || []);
  }

  // — Computed —
  totalIncome = computed(() => this._incomesSignal().reduce((sum, inc) => sum + inc.amount, 0));
  totalExpenses = computed(() => this._expensesSignal().reduce((sum, exp) => sum + exp.amount, 0));
  netProfit = computed(() => this.totalIncome() - this.totalExpenses());

  programStats = computed(() => {
    const statsMap = new Map<string, { income: number; expense: number; attendees: number }>();
    
    for (const prog of this._programsSignal()) {
      statsMap.set(prog.id, { income: 0, expense: 0, attendees: 0 });
    }

    for (const inc of this._incomesSignal()) {
      const st = statsMap.get(inc.programId);
      if (st) {
        st.income += inc.amount;
        if (inc.attendeesCount) {
          st.attendees += (Number(inc.attendeesCount) || 0);
        }
      }
    }

    for (const exp of this._expensesSignal()) {
      const st = statsMap.get(exp.programId);
      if (st) {
        st.expense += exp.amount;
      }
    }

    return statsMap;
  });

  // — CRUD Programs —
  addProgram(data: Omit<EducationalProgram, 'id' | 'createdAt'>): void {
    const record: EducationalProgram = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this._programsSignal()];
    this._programsSignal.set(updated);
    this.storage.set(this.PROGRAMS_KEY, updated);
    this.dataSync.trackLocalModification(this.PROGRAMS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  updateProgram(id: string, data: Partial<EducationalProgram>): void {
    const updated = this._programsSignal().map(p => p.id === id ? { ...p, ...data } : p);
    this._programsSignal.set(updated);
    this.storage.set(this.PROGRAMS_KEY, updated);
    this.dataSync.trackLocalModification(this.PROGRAMS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  deleteProgram(id: string): void {
    const updated = this._programsSignal().map(p => p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p);
    this._programsSignal.set(updated);
    this.storage.set(this.PROGRAMS_KEY, updated);
    this.dataSync.trackLocalModification(this.PROGRAMS_KEY);
    this.dataSync.saveToServerDebounced();
    
    // Also delete associated incomes and expenses
    const updatedIncomes = this._incomesSignal().map(i => i.programId === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i);
    this._incomesSignal.set(updatedIncomes);
    this.storage.set(this.INCOMES_KEY, updatedIncomes);
    this.dataSync.trackLocalModification(this.INCOMES_KEY);
    this.dataSync.saveToServerDebounced();
    
    const updatedExpenses = this._expensesSignal().map(e => e.programId === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e);
    this._expensesSignal.set(updatedExpenses);
    this.storage.set(this.EXPENSES_KEY, updatedExpenses);
    this.dataSync.trackLocalModification(this.EXPENSES_KEY);
    this.dataSync.saveToServerImmediate();
  }

  // — CRUD Incomes —
  addIncome(data: Omit<ProgramIncome, 'id' | 'createdAt'>): void {
    const record: ProgramIncome = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this._incomesSignal()];
    this._incomesSignal.set(updated);
    this.storage.set(this.INCOMES_KEY, updated);
    this.dataSync.trackLocalModification(this.INCOMES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  deleteIncome(id: string): void {
    const updated = this._incomesSignal().map(i => i.id === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i);
    this._incomesSignal.set(updated);
    this.storage.set(this.INCOMES_KEY, updated);
    this.dataSync.trackLocalModification(this.INCOMES_KEY);
    this.dataSync.saveToServerImmediate();
  }

  // — CRUD Expenses —
  addExpense(data: Omit<ProgramExpense, 'id' | 'createdAt'>): void {
    const record: ProgramExpense = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this._expensesSignal()];
    this._expensesSignal.set(updated);
    this.storage.set(this.EXPENSES_KEY, updated);
    this.dataSync.trackLocalModification(this.EXPENSES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  deleteExpense(id: string): void {
    const updated = this._expensesSignal().map(e => e.id === id ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e);
    this._expensesSignal.set(updated);
    this.storage.set(this.EXPENSES_KEY, updated);
    this.dataSync.trackLocalModification(this.EXPENSES_KEY);
    this.dataSync.saveToServerImmediate();
  }
}
