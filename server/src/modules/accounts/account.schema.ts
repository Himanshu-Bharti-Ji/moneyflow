import { z } from 'zod';

const accountTypes = ['cash', 'bank', 'credit_card', 'wallet'] as const;

export const createAccountSchema = z.object({
  body: z.object({
    name:           z.string().min(1, 'Name is required').max(100),
    type:           z.enum(accountTypes, { errorMap: () => ({ message: 'Invalid account type' }) }),
    openingBalance: z.number({ invalid_type_error: 'Balance must be a number' }).default(0),
    color:          z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').default('#10b981'),
    icon:           z.string().default('wallet'),
  }),
});

export const updateAccountSchema = z.object({
  body: z.object({
    name:  z.string().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    icon:  z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const accountParamSchema = z.object({
  params: z.object({ id: z.string().min(1, 'Account ID required') }),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>['body'];
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>['body'];
