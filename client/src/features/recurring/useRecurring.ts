import { useState, useEffect, useCallback } from 'react';
import { recurringApi, type RecurringInput } from './recurring.api';
import type { RecurringTransaction } from '../../types';

export function useRecurring() {
  const [items,   setItems]   = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setItems(await recurringApi.list()); }
    catch { setError('Failed to load recurring transactions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (data: RecurringInput) => {
    const created = await recurringApi.create(data);
    setItems((prev) => [created, ...prev]);
    return created;
  };

  const update = async (id: string, data: Partial<RecurringInput>) => {
    const updated = await recurringApi.update(id, data);
    setItems((prev) => prev.map((r) => r._id === id ? updated : r));
    return updated;
  };

  const remove = async (id: string) => {
    await recurringApi.remove(id);
    setItems((prev) => prev.filter((r) => r._id !== id));
  };

  const toggle = (id: string, current: boolean) => update(id, { isActive: !current });

  return { items, loading, error, create, update, remove, toggle, refresh: load };
}
