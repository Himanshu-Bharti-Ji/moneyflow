import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name:  z.string().min(1, 'Name is required').max(100),
    type:  z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Type must be income or expense' }) }),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').default('#10b981'),
    icon:  z.string().min(1).default('📦'),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name:  z.string().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    icon:  z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const categoryParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
