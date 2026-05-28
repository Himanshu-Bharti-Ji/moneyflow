import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { getDashboardData } from './dashboard.service.js';

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();
    const data  = await getDashboardData((req as AuthRequest).userId, month, year);
    res.json(data);
  } catch (err) { next(err); }
}
