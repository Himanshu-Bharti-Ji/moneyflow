import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as ctrl from './notification.controller.js';

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get('/',            ctrl.list);
notificationRouter.get('/unread-count', ctrl.unreadCount);
notificationRouter.patch('/read-all',   ctrl.markAllRead);
notificationRouter.patch('/:id/read',   ctrl.markRead);
notificationRouter.delete('/clear-all', ctrl.clearAll);
notificationRouter.delete('/:id',       ctrl.remove);
