import { api } from '../../lib/api';
import type { Category } from '../../types';

export interface CreateCategoryData {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export const categoriesApi = {
  list: () =>
    api.get<{ categories: Category[] }>('/categories').then((r) => r.data.categories),

  create: (data: CreateCategoryData) =>
    api.post<{ category: Category }>('/categories', data).then((r) => r.data.category),

  update: (id: string, data: Partial<CreateCategoryData>) =>
    api.patch<{ category: Category }>(`/categories/${id}`, data).then((r) => r.data.category),

  delete: (id: string) =>
    api.delete(`/categories/${id}`).then((r) => r.data),
};
