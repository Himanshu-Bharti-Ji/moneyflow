import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createTransactionSchema, updateTransactionSchema, listTransactionSchema } from './transaction.schema.js';
import { list, getOne, create, update, remove, monthlySummary } from './transaction.controller.js';

export const transactionRouter = Router();
transactionRouter.use(requireAuth);

transactionRouter.get('/summary', monthlySummary);
transactionRouter.get('/',        validate(listTransactionSchema), list);
transactionRouter.get('/:id',     getOne);
transactionRouter.post('/',       validate(createTransactionSchema), create);
transactionRouter.patch('/:id',   validate(updateTransactionSchema), update);
transactionRouter.delete('/:id',  remove);
