import { useState, useEffect, useCallback } from 'react';
import { transactionsApi, type CreateTransactionData } from './transactions.api';
import type { Transaction } from '../../types';

interface Filters {
  type?:       string;
  accountId?:  string;
  categoryId?: string;
  startDate?:  string;
  endDate?:    string;
  search?:     string;
  minAmount?:  number;
  maxAmount?:  number;
  page?:       number;
}

export function useTransactions(filters: Filters = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total,  setTotal]  = useState(0);
  const [pages,  setPages]  = useState(1);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const clean = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== '' && v != null));
      const res = await transactionsApi.list({ limit: 20, ...clean });
      setTransactions(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  const create = async (data: CreateTransactionData) => {
    const tx = await transactionsApi.create(data);
    await load();
    return tx;
  };

  const remove = async (id: string) => {
    await transactionsApi.delete(id);
    // Full refresh keeps total, pages, and list in sync (avoids page-count desync)
    await load();
  };

  return { transactions, total, pages, loading, error, create, remove, refresh: load };
}
