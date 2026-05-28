import { z } from 'zod';

export const createTransactionSchema = z.object({
  body: z.object({
    type:               z.enum(['income', 'expense', 'transfer']),
    amount:             z.coerce.number().positive('Amount must be greater than 0'),
    accountId:          z.string().min(1, 'Account is required'),
    categoryId:         z.string().optional().nullable(),
    transferAccountId:  z.string().optional().nullable(),
    date:               z.coerce.date(),
    notes:              z.string().max(500).default(''),
  }).refine((d) => {
    if (d.type === 'transfer') return !!d.transferAccountId;
    return true;
  }, { message: 'Transfer account is required for transfers', path: ['transferAccountId'] })
  .refine((d) => {
    if (d.type === 'transfer' && d.transferAccountId) {
      return d.accountId !== d.transferAccountId;
    }
    return true;
  }, { message: 'Source and destination accounts must be different', path: ['transferAccountId'] }),
});

export const updateTransactionSchema = z.object({
  body: z.object({
    amount:     z.coerce.number().positive().optional(),
    categoryId: z.string().optional().nullable(),
    date:       z.coerce.date().optional(),
    notes:      z.string().max(500).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const listTransactionSchema = z.object({
  query: z.object({
    page:       z.coerce.number().default(1),
    limit:      z.coerce.number().default(20),
    type:       z.enum(['income','expense','transfer']).optional(),
    accountId:  z.string().optional(),
    categoryId: z.string().optional(),
    startDate:  z.string().optional(),
    endDate:    z.string().optional(),
    search:     z.string().optional(),
    minAmount:  z.coerce.number().optional(),
    maxAmount:  z.coerce.number().optional(),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
export type ListTransactionQuery   = z.infer<typeof listTransactionSchema>['query'];
