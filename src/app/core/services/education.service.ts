import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { StorageService } from './storage.service';

// ═══════════════════════════════════════════
//  MODELS
// ═══════════════════════════════════════════

export type EducationProgramType = 'course' | 'workshop' | 'diploma' | 'conference' | 'other';

export interface EducationalProgram {
  id: string;
  name: string;
  type: EducationProgramType;
  status: 'active' | 'completed';
  createdAt: string;
  description?: string;
}

export interface ProgramIncome {
  id: string;
  programId: string;
  type: 'per_person' | 'global';
  amount: number; // Total amount collected
  attendeesCount?: number; // Optional
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
}

export interface ProgramExpense {
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
  'Honorarios Docentes',
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

  programs = signal<EducationalProgram[]>([]);
  incomes = signal<ProgramIncome[]>([]);
  expenses = signal<ProgramExpense[]>([]);

  constructor() {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage(): void {
    this.programs.set(this.storage.get<EducationalProgram[]>(this.PROGRAMS_KEY) || []);
    this.incomes.set(this.storage.get<ProgramIncome[]>(this.INCOMES_KEY) || []);
    this.expenses.set(this.storage.get<ProgramExpense[]>(this.EXPENSES_KEY) || []);
  }

  // — Computed —
  totalIncome = computed(() => this.incomes().reduce((sum, inc) => sum + inc.amount, 0));
  totalExpenses = computed(() => this.expenses().reduce((sum, exp) => sum + exp.amount, 0));
  netProfit = computed(() => this.totalIncome() - this.totalExpenses());

  programStats = computed(() => {
    const statsMap = new Map<string, { income: number; expense: number; attendees: number }>();
    
    for (const prog of this.programs()) {
      statsMap.set(prog.id, { income: 0, expense: 0, attendees: 0 });
    }

    for (const inc of this.incomes()) {
      const st = statsMap.get(inc.programId);
      if (st) {
        st.income += inc.amount;
        if (inc.attendeesCount) {
          st.attendees += (Number(inc.attendeesCount) || 0);
        }
      }
    }

    for (const exp of this.expenses()) {
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
    const updated = [record, ...this.programs()];
    this.programs.set(updated);
    this.storage.set(this.PROGRAMS_KEY, updated);
  }

  updateProgram(id: string, data: Partial<EducationalProgram>): void {
    const updated = this.programs().map(p => p.id === id ? { ...p, ...data } : p);
    this.programs.set(updated);
    this.storage.set(this.PROGRAMS_KEY, updated);
  }

  deleteProgram(id: string): void {
    const updated = this.programs().filter(p => p.id !== id);
    this.programs.set(updated);
    this.storage.set(this.PROGRAMS_KEY, updated);
    
    // Also delete associated incomes and expenses
    const updatedIncomes = this.incomes().filter(i => i.programId !== id);
    this.incomes.set(updatedIncomes);
    this.storage.set(this.INCOMES_KEY, updatedIncomes);
    
    const updatedExpenses = this.expenses().filter(e => e.programId !== id);
    this.expenses.set(updatedExpenses);
    this.storage.set(this.EXPENSES_KEY, updatedExpenses);
  }

  // — CRUD Incomes —
  addIncome(data: Omit<ProgramIncome, 'id' | 'createdAt'>): void {
    const record: ProgramIncome = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this.incomes()];
    this.incomes.set(updated);
    this.storage.set(this.INCOMES_KEY, updated);
  }

  deleteIncome(id: string): void {
    const updated = this.incomes().filter(i => i.id !== id);
    this.incomes.set(updated);
    this.storage.set(this.INCOMES_KEY, updated);
  }

  // — CRUD Expenses —
  addExpense(data: Omit<ProgramExpense, 'id' | 'createdAt'>): void {
    const record: ProgramExpense = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [record, ...this.expenses()];
    this.expenses.set(updated);
    this.storage.set(this.EXPENSES_KEY, updated);
  }

  deleteExpense(id: string): void {
    const updated = this.expenses().filter(e => e.id !== id);
    this.expenses.set(updated);
    this.storage.set(this.EXPENSES_KEY, updated);
  }
}
