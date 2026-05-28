import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, type DashboardData } from './dashboard.api';

export function useDashboard(month: number, year: number) {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setData(await dashboardApi.get(month, year));
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}
