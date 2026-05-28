import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { upsertBudgetSchema, getBudgetSchema } from './budget.schema.js';
import { createCustomBudgetSchema } from './custom-budget.schema.js';
import { get, upsert } from './budget.controller.js';
import { listCustom, createCustom, removeCustom } from './custom-budget.controller.js';

export const budgetRouter = Router();
budgetRouter.use(requireAuth);

// Monthly budgets (existing)
budgetRouter.get('/',  validate(getBudgetSchema), get);
budgetRouter.post('/', validate(upsertBudgetSchema), upsert);

// Custom range budgets (new)
budgetRouter.get('/custom',     listCustom);
budgetRouter.post('/custom',    validate(createCustomBudgetSchema), createCustom);
budgetRouter.delete('/custom/:id', removeCustom);