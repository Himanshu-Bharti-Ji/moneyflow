import { z } from 'zod';

export const createCustomBudgetSchema = z.object({
  body: z.object({
    name:         z.string().max(100).default(''),
    startDate:    z.string().min(1, 'Start date is required'),
    endDate:      z.string().min(1, 'End date is required'),
    overallLimit: z.coerce.number().min(1, 'Set an overall limit'),
    categoryBudgets: z.array(z.object({
      categoryId: z.string().min(1),
      limit:      z.coerce.number().min(0),
    })).default([]),
  }).refine(
    (d) => new Date(d.endDate) >= new Date(d.startDate),
    { message: 'End date must be on or after start date', path: ['endDate'] }
  ),
});

export type CreateCustomBudgetInput = z.infer<typeof createCustomBudgetSchema>['body'];