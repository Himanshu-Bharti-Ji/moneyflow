import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createCategorySchema, updateCategorySchema, categoryParamSchema } from './category.schema.js';
import { list, create, update, remove } from './category.controller.js';

export const categoryRouter = Router();

categoryRouter.use(requireAuth);

categoryRouter.get('/',      list);
categoryRouter.post('/',     validate(createCategorySchema), create);
categoryRouter.patch('/:id', validate(updateCategorySchema), update);
categoryRouter.delete('/:id',validate(categoryParamSchema),  remove);
