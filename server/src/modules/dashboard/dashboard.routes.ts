import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { dashboard } from './dashboard.controller.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get('/', dashboard);
