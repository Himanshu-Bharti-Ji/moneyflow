import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createAccountSchema, updateAccountSchema, accountParamSchema } from './account.schema.js';
import { list, getOne, create, update, remove } from './account.controller.js';

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.get('/',     list);
accountRouter.get('/:id',  validate(accountParamSchema), getOne);
accountRouter.post('/',    validate(createAccountSchema), create);
accountRouter.patch('/:id',validate(updateAccountSchema), update);
accountRouter.delete('/:id',validate(accountParamSchema), remove);
