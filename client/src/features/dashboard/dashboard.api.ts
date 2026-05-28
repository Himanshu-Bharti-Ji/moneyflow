import { api } from '../../lib/api';
import type { Transaction } from '../../types';

export interface TrendPoint {
  name: string;
  income: number;
  expense: number;
}

export interface CategorySlice {
  _id: string;
  name: string;
  color: string;
  icon: string;
  value: number;
}

export interface DashboardData {
  totalBalance:      number;
  income:            number;
  expense:           number;
  savings:           number;
  trend:             TrendPoint[];
  categoryBreakdown: CategorySlice[];
  recent:            Transaction[];
}

export const dashboardApi = {
  get: (month?: number, year?: number) =>
    api.get<DashboardData>('/dashboard', { params: { month, year } }).then((r) => r.data),
};
