import { useState, useEffect, useCallback } from 'react';
import { categoriesApi, type CreateCategoryData } from './categories.api';
import type { Category } from '../../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setCategories(await categoriesApi.list());
    } catch {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (data: CreateCategoryData) => {
    const cat = await categoriesApi.create(data);
    setCategories((prev) => [...prev, cat]);
    return cat;
  };

  const update = async (id: string, data: Partial<CreateCategoryData>) => {
    const cat = await categoriesApi.update(id, data);
    setCategories((prev) => prev.map((c) => (c._id === id ? cat : c)));
    return cat;
  };

  const remove = async (id: string) => {
    await categoriesApi.delete(id);
    setCategories((prev) => prev.filter((c) => c._id !== id));
  };

  const expense = categories.filter((c) => c.type === 'expense');
  const income  = categories.filter((c) => c.type === 'income');

  return { categories, expense, income, loading, error, create, update, remove, refresh: load };
}
