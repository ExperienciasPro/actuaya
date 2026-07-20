import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { StorageService } from './storage.service';
import { AnnualBudget, BudgetEntry } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'um_annual_budget';

  private budgetsSignal = signal<AnnualBudget[]>([]);

  budgets = this.budgetsSignal.asReadonly();

  constructor() {
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.budgetsSignal.set(this.loadFromStorage());
      }
    });
  }

  private loadFromStorage(): AnnualBudget[] {
    return this.storage.get<AnnualBudget[]>(this.STORAGE_KEY) || [];
  }

  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this.budgetsSignal());
  }

  /** Called by DataSyncService to set server data directly into the signal */
  hydrateDirectly(data: any): void {
    if (Array.isArray(data)) {
      this.budgetsSignal.set(data as AnnualBudget[]);
    }
  }

  getByYear(year: number): AnnualBudget | undefined {
    return this.budgetsSignal().find(b => b.year === year);
  }

  ensureYear(year: number): AnnualBudget {
    let budget = this.getByYear(year);
    if (!budget) {
      budget = { year, entries: [] };
      this.budgetsSignal.update(b => [...b, budget!]);
      this.persist();
    }
    return budget;
  }

  addEntry(year: number, name: string, amount: number, category: 'income' | 'investment'): void {
    this.ensureYear(year);
    const entry: BudgetEntry = {
      id: crypto.randomUUID(),
      name,
      amount,
      category,
      order: 0,
    };
    this.budgetsSignal.update(budgets =>
      budgets.map(b => {
        if (b.year !== year) return b;
        
        // Colocamos el nuevo registro al inicio
        const updatedEntries = [entry, ...b.entries];
        
        // Re-mapeamos los índices 'order' según su nueva posición en la lista por categoría
        let incIdx = 0;
        let invIdx = 0;
        const reordered = updatedEntries.map(e => {
          if (e.category === 'income') {
            return { ...e, order: incIdx++ };
          } else {
            return { ...e, order: invIdx++ };
          }
        });
        
        return { ...b, entries: reordered };
      })
    );
    this.persist();
  }

  updateEntry(year: number, entryId: string, changes: Partial<BudgetEntry>): void {
    this.budgetsSignal.update(budgets =>
      budgets.map(b => {
        if (b.year !== year) return b;
        return { ...b, entries: b.entries.map(e => e.id === entryId ? { ...e, ...changes } : e) };
      })
    );
    this.persist();
  }

  deleteEntry(year: number, entryId: string): void {
    this.budgetsSignal.update(budgets =>
      budgets.map(b => {
        if (b.year !== year) return b;
        return { ...b, entries: b.entries.filter(e => e.id !== entryId) };
      })
    );
    this.persist();
  }

  getIncomeEntries(year: number): BudgetEntry[] {
    return (this.getByYear(year)?.entries || [])
      .filter(e => e.category === 'income')
      .sort((a, b) => a.order - b.order);
  }

  getInvestmentEntries(year: number): BudgetEntry[] {
    return (this.getByYear(year)?.entries || [])
      .filter(e => e.category === 'investment')
      .sort((a, b) => a.order - b.order);
  }

  totalIncome(year: number): number {
    return this.getIncomeEntries(year).reduce((s, e) => s + e.amount, 0);
  }

  totalInvestments(year: number): number {
    return this.getInvestmentEntries(year).reduce((s, e) => s + e.amount, 0);
  }

  balance(year: number): number {
    return this.totalIncome(year) - this.totalInvestments(year);
  }

  importFromAccounting(year: number, incomes: any[], investments: any[]): { importedIncomes: number; importedInvestments: number } {
    this.ensureYear(year);
    
    const yearIncomes = incomes.filter(i => i.date?.startsWith(year.toString()));
    const groupedIncomes = new Map<string, number>();
    for (const inc of yearIncomes) {
      const key = inc.company + (inc.concept && inc.concept !== 'Dividendos' ? ` - ${inc.concept}` : '');
      groupedIncomes.set(key, (groupedIncomes.get(key) || 0) + (inc.amount || 0));
    }

    const yearInvestments = investments.filter(inv => inv.purchaseDate?.startsWith(year.toString()));

    let importedIncomes = 0;
    let importedInvestments = 0;

    this.budgetsSignal.update(budgets => budgets.map(b => {
      if (b.year !== year) return b;

      const newEntries = [...b.entries];

      // Import incomes
      let incomeOrder = newEntries.filter(e => e.category === 'income').length;
      groupedIncomes.forEach((amount, name) => {
        if (!newEntries.some(e => e.category === 'income' && e.name === name)) {
          newEntries.push({
            id: crypto.randomUUID(),
            name,
            amount,
            category: 'income',
            order: incomeOrder++
          });
          importedIncomes++;
        }
      });

      // Import investments
      let investOrder = newEntries.filter(e => e.category === 'investment').length;
      for (const inv of yearInvestments) {
        const name = inv.name;
        if (!newEntries.some(e => e.category === 'investment' && e.name === name)) {
          newEntries.push({
            id: crypto.randomUUID(),
            name,
            amount: inv.amount || inv.currentValue || 0,
            category: 'investment',
            order: investOrder++
          });
          importedInvestments++;
        }
      }

      return { ...b, entries: newEntries };
    }));

    if (importedIncomes > 0 || importedInvestments > 0) {
      this.persist();
    }

    return { importedIncomes, importedInvestments };
  }
}
