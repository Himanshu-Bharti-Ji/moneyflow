import { api } from '../../lib/api';
import type { Transaction } from '../../types';

export interface CreateTransactionData {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId: string;
  categoryId?: string | null;
  transferAccountId?: string | null;
  date: string;
  notes?: string;
}

export interface TransactionList {
  data: Transaction[];
  total: number;
  page: number;
  pages: number;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  savings: number;
}

export const transactionsApi = {
  list: (params?: Record<string, any>) =>
    api.get<TransactionList>('/transactions', { params }).then((r) => r.data),

  create: (data: CreateTransactionData) =>
    api.post<{ transaction: Transaction }>('/transactions', data).then((r) => r.data.transaction),

  update: (id: string, data: Partial<CreateTransactionData>) =>
    api.patch<{ transaction: Transaction }>(`/transactions/${id}`, data).then((r) => r.data.transaction),

  delete: (id: string) =>
    api.delete(`/transactions/${id}`).then((r) => r.data),

  summary: (month?: number, year?: number) =>
    api.get<MonthlySummary>('/transactions/summary', { params: { month, year } }).then((r) => r.data),
};
