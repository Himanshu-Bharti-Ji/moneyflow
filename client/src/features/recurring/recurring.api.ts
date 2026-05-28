import { api } from '../../lib/api';
import type { RecurringTransaction } from '../../types';

export interface RecurringInput {
  type:       'income' | 'expense';
  amount:     number;
  accountId:  string;
  categoryId?: string | null;
  notes?:     string;
  frequency:  'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate:  string;
  endDate?:   string | null;
  isActive?:  boolean;
}

export const recurringApi = {
  list:   () => api.get<RecurringTransaction[]>('/recurring').then((r) => r.data),
  create: (data: RecurringInput) => api.post<RecurringTransaction>('/recurring', data).then((r) => r.data),
  update: (id: string, data: Partial<RecurringInput>) => api.put<RecurringTransaction>(`/recurring/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/recurring/${id}`),
};
