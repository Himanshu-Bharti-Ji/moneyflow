import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { getReport } from './reports.controller.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.get('/', getReport);
