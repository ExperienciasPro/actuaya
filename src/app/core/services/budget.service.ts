import { Injectable, inject, signal, computed, effect, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { AnnualBudget, BudgetEntry } from '../models/budget.model';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private storage = inject(StorageService);
  private injector = inject(Injector);
  private readonly STORAGE_KEY = 'um_annual_budget';

  /** Lazy-resolve DataSyncService to avoid circular dependency */
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

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
    // Stamp updatedAt on all budgets before saving
    const now = new Date().toISOString();
    this.budgetsSignal.update(budgets =>
      budgets.map(b => ({ ...b, updatedAt: now }))
    );
    this.storage.set(this.STORAGE_KEY, this.budgetsSignal());
    // Protect this key from being overwritten by stale server data
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    // Push changes to server
    this.dataSync.saveToServerDebounced();
  }

  /**
   * Called by DataSyncService to merge server data with local data.
   */
  hydrateDirectly(serverData: any): void {
    if (!Array.isArray(serverData)) return;

    const serverBudgets = serverData as AnnualBudget[];
    const localBudgets = this.loadFromStorage();

    if (!localBudgets.length) {
      this.budgetsSignal.set(serverBudgets);
      return;
    }

    const localMap = new Map(localBudgets.map(b => [b.year, b]));
    const serverMap = new Map(serverBudgets.map(b => [b.year, b]));
    const allYears = new Set([...localMap.keys(), ...serverMap.keys()]);

    const merged: AnnualBudget[] = [];
    let localWins = false;

    for (const year of allYears) {
      const local = localMap.get(year);
      const server = serverMap.get(year);

      if (!server) {
        merged.push(local!);
        localWins = true;
      } else if (!local) {
        merged.push(server);
      } else {
        // Merge entries per-ID instead of just taking the whole year array
        const entryMap = new Map<string, BudgetEntry>();
        for (const e of server.entries || []) {
          entryMap.set(e.id, e);
        }
        
        let yearLocalWins = false;
        
        for (const localEntry of local.entries || []) {
          const serverEntry = entryMap.get(localEntry.id);
          if (!serverEntry) {
            entryMap.set(localEntry.id, localEntry);
            yearLocalWins = true;
          } else {
            const tLocal = new Date(localEntry.updatedAt || 0).getTime();
            const tServer = new Date(serverEntry.updatedAt || 0).getTime();
            if (tLocal >= tServer) {
              entryMap.set(localEntry.id, localEntry);
              yearLocalWins = true;
            }
          }
        }
        
        const mergedEntries = Array.from(entryMap.values());
        
        if (yearLocalWins) {
          localWins = true;
          // Keep local timestamp for the year since we kept some local data
          merged.push({ ...local, entries: mergedEntries });
        } else {
          // If server won all entries, just take server's year
          merged.push({ ...server, entries: mergedEntries });
        }
      }
    }

    this.budgetsSignal.set(merged);

    if (localWins) {
      this.persist();
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
      updatedAt: new Date().toISOString()
    };
    this.budgetsSignal.update(budgets =>
      budgets.map(b => {
        if (b.year !== year) return b;
        
        const updatedEntries = [entry, ...b.entries];
        
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
        return { 
          ...b, 
          entries: b.entries.map(e => 
            e.id === entryId ? { ...e, ...changes, updatedAt: new Date().toISOString() } : e
          ) 
        };
      })
    );
    this.persist();
  }

  deleteEntry(year: number, entryId: string): void {
    this.budgetsSignal.update(budgets =>
      budgets.map(b => {
        if (b.year !== year) return b;
        return { 
          ...b, 
          entries: b.entries.map(e => 
            e.id === entryId ? { ...e, isDeleted: true, updatedAt: new Date().toISOString() } : e
          )
        };
      })
    );
    this.persist();
    try { this.dataSync.saveToServerImmediate(); } catch (e) { console.warn('[BudgetService] Error forzando guardado inmediato:', e); }
  }

  getIncomeEntries(year: number): BudgetEntry[] {
    return (this.getByYear(year)?.entries || [])
      .filter(e => e.category === 'income' && !e.isDeleted)
      .sort((a, b) => a.order - b.order);
  }

  getInvestmentEntries(year: number): BudgetEntry[] {
    return (this.getByYear(year)?.entries || [])
      .filter(e => e.category === 'investment' && !e.isDeleted)
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
    const now = new Date().toISOString();

    this.budgetsSignal.update(budgets => budgets.map(b => {
      if (b.year !== year) return b;

      const newEntries = [...b.entries];

      // Import incomes
      let incomeOrder = newEntries.filter(e => e.category === 'income' && !e.isDeleted).length;
      groupedIncomes.forEach((amount, name) => {
        if (!newEntries.some(e => e.category === 'income' && e.name === name && !e.isDeleted)) {
          newEntries.push({
            id: crypto.randomUUID(),
            name,
            amount,
            category: 'income',
            order: incomeOrder++,
            updatedAt: now
          });
          importedIncomes++;
        }
      });

      // Import investments
      let investOrder = newEntries.filter(e => e.category === 'investment' && !e.isDeleted).length;
      for (const inv of yearInvestments) {
        const name = inv.name;
        if (!newEntries.some(e => e.category === 'investment' && e.name === name && !e.isDeleted)) {
          newEntries.push({
            id: crypto.randomUUID(),
            name,
            amount: inv.amount || inv.currentValue || 0,
            category: 'investment',
            order: investOrder++,
            updatedAt: now
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
