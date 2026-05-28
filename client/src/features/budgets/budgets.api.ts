import { api } from '../../lib/api';
import type { BudgetData } from '../../types';

export interface UpsertBudgetData {
  month:        number;
  year:         number;
  overallLimit: number;
  categoryBudgets: { categoryId: string; limit: number }[];
}

export const budgetsApi = {
  get: (month: number, year: number) =>
    api.get<BudgetData>('/budgets', { params: { month, year } }).then((r) => r.data),

  upsert: (data: UpsertBudgetData) =>
    api.post<BudgetData>('/budgets', data).then((r) => r.data),
};
