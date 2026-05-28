import { z } from 'zod';

export const upsertBudgetSchema = z.object({
  body: z.object({
    month:        z.coerce.number().min(1).max(12),
    year:         z.coerce.number().min(2000).max(2100),
    overallLimit: z.coerce.number().min(0),
    categoryBudgets: z.array(z.object({
      categoryId: z.string().min(1),
      limit:      z.coerce.number().min(0),
    })).default([]),
  }).refine((d) => {
    const now      = new Date();
    const curYear  = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    if (d.year < curYear) return false;
    if (d.year === curYear && d.month < curMonth) return false;
    return true;
  }, { message: 'Cannot create or edit budgets for past months', path: ['month'] }),
});

export const getBudgetSchema = z.object({
  query: z.object({
    month: z.coerce.number().min(1).max(12),
    year:  z.coerce.number().min(2000),
  }),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>['body'];
