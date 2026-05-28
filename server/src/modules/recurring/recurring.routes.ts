import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as ctrl from './recurring.controller.js';

export const recurringRouter = Router();
recurringRouter.use(requireAuth);

recurringRouter.get('/',     ctrl.list);
recurringRouter.post('/',    ctrl.create);
recurringRouter.put('/:id',  ctrl.update);
recurringRouter.delete('/:id', ctrl.remove);
