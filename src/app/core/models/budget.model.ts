export interface BudgetEntry {
  id: string;
  name: string;
  amount: number;
  category: 'income' | 'investment';
  order: number;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface AnnualBudget {
  year: number;
  entries: BudgetEntry[];
  /** ISO timestamp of last local edit — used for conflict resolution */
  updatedAt?: string;
}
