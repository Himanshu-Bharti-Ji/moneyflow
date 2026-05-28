import { Router } from 'express';
import { dbStatus } from '../../config/db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    db: dbStatus(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});
