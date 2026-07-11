export interface BudgetEntry {
  id: string;
  name: string;
  amount: number;
  category: 'income' | 'investment';
  order: number;
}

export interface AnnualBudget {
  year: number;
  entries: BudgetEntry[];
}
