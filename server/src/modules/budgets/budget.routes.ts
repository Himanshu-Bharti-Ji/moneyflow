import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { upsertBudgetSchema, getBudgetSchema } from './budget.schema.js';
import { get, upsert } from './budget.controller.js';

export const budgetRouter = Router();
budgetRouter.use(requireAuth);

budgetRouter.get('/',  validate(getBudgetSchema), get);
budgetRouter.post('/', validate(upsertBudgetSchema), upsert);
