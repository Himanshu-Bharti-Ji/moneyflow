import { useState, useEffect, useCallback } from 'react';
import { budgetsApi, type UpsertBudgetData } from './budgets.api';
import type { BudgetData } from '../../types';

export function useBudget(month: number, year: number) {
  const [data,    setData]    = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await budgetsApi.get(month, year)); }
    catch { setError('Failed to load budget'); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const save = async (input: UpsertBudgetData) => {
    const result = await budgetsApi.upsert(input);
    setData(result);
    return result;
  };

  return { data, loading, error, save, refresh: load };
}
