export type BudgetStatus = 'ok' | 'warning' | 'exceeded' | 'critical';

export interface CategoryBudgetItem {
  _id:        string;
  categoryId: string;
  name:       string;
  color:      string;
  icon:       string;
  limit:      number;
  spent:      number;
  percentage: number;
  status:     BudgetStatus;
}

export interface BudgetData {
  month:             number;
  year:              number;
  overallLimit:      number;
  totalSpent:        number;
  overallPercentage: number;
  overallStatus:     BudgetStatus;
  categoryBudgets:   CategoryBudgetItem[];
  hasBudget:         boolean;
}
