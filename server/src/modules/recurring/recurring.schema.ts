import { z } from 'zod';

const baseFields = z.object({
  type:       z.enum(['income','expense']),
  amount:     z.coerce.number().positive('Amount must be positive'),
  accountId:  z.string().min(1, 'Account is required'),
  categoryId: z.string().optional().nullable(),
  notes:      z.string().max(200).optional().default(''),
  frequency:  z.enum(['daily','weekly','monthly','yearly']),
  startDate:  z.string().min(1, 'Start date is required'),
  endDate:    z.string().optional().nullable(),
  isActive:   z.boolean().optional().default(true),
});

/* Create: startDate must be today or future + endDate >= startDate */
export const createRecurringSchema = baseFields
  .refine(
    (d) => !d.endDate || new Date(d.endDate) >= new Date(d.startDate),
    { message: 'End date must be on or after start date', path: ['endDate'] }
  );

/* Update: partial, only endDate >= startDate (start date is allowed to stay historical) */
export const updateRecurringSchema = z.object({
  type:       z.enum(['income','expense']).optional(),
  amount:     z.coerce.number().positive().optional(),
  accountId:  z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  notes:      z.string().max(200).optional(),
  frequency:  z.enum(['daily','weekly','monthly','yearly']).optional(),
  startDate:  z.string().optional(),
  endDate:    z.string().optional().nullable(),
  isActive:   z.boolean().optional(),
}).refine(
  (d) => !d.endDate || !d.startDate || new Date(d.endDate) >= new Date(d.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
