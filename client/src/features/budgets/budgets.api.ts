import { api } from '../../lib/api';
import type { BudgetData, CustomBudgetData } from '../../types';

export interface UpsertBudgetData {
  month:        number;
  year:         number;
  overallLimit: number;
  categoryBudgets: { categoryId: string; limit: number }[];
}

export interface CreateCustomBudgetData {
  name:         string;
  startDate:    string;
  endDate:      string;
  overallLimit: number;
  categoryBudgets: { categoryId: string; limit: number }[];
}

export const budgetsApi = {
  // Monthly
  get: (month: number, year: number) =>
    api.get<BudgetData>('/budgets', { params: { month, year } }).then((r) => r.data),

  upsert: (data: UpsertBudgetData) =>
    api.post<BudgetData>('/budgets', data).then((r) => r.data),

  // Custom range
  listCustom: () =>
    api.get<CustomBudgetData[]>('/budgets/custom').then((r) => r.data),

  createCustom: (data: CreateCustomBudgetData) =>
    api.post<CustomBudgetData>('/budgets/custom', data).then((r) => r.data),

  deleteCustom: (id: string) =>
    api.delete(`/budgets/custom/${id}`).then((r) => r.data),
};