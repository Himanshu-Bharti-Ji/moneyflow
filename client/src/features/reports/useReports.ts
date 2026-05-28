import { useState, useEffect } from 'react';
import { reportsApi } from './reports.api';
import type { ReportData } from '../../types';

export function useReports(startDate: string, endDate: string) {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true); setError('');
    reportsApi.get(startDate, endDate)
      .then(setData)
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return { data, loading, error };
}
