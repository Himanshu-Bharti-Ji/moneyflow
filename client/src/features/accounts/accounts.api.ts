import { api } from '../../lib/api';
import type { Account } from '../../types';

export interface CreateAccountData {
  name: string;
  type: string;
  openingBalance: number;
  color: string;
  icon: string;
}

export const accountsApi = {
  list: () =>
    api.get<{ accounts: Account[] }>('/accounts').then((r) => r.data.accounts),

  create: (data: CreateAccountData) =>
    api.post<{ account: Account }>('/accounts', data).then((r) => r.data.account),

  update: (id: string, data: Partial<CreateAccountData>) =>
    api.patch<{ account: Account }>(`/accounts/${id}`, data).then((r) => r.data.account),

  delete: (id: string) =>
    api.delete(`/accounts/${id}`).then((r) => r.data),
};
