import { useState, useEffect, useCallback } from 'react';
import { accountsApi, type CreateAccountData } from './accounts.api';
import type { Account } from '../../types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await accountsApi.list();
      setAccounts(data);
    } catch {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (data: CreateAccountData) => {
    const account = await accountsApi.create(data);
    setAccounts((prev) => [...prev, account]);
    return account;
  };

  const update = async (id: string, data: Partial<CreateAccountData>) => {
    const account = await accountsApi.update(id, data);
    setAccounts((prev) => prev.map((a) => (a._id === id ? account : a)));
    return account;
  };

  const remove = async (id: string) => {
    await accountsApi.delete(id);
    setAccounts((prev) => prev.filter((a) => a._id !== id));
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  return { accounts, loading, error, totalBalance, create, update, remove, refresh: load };
}
