import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { upsertBudget, getBudgetWithUsage } from './budget.service.js';
import { checkBudgetAlerts } from '../notifications/notification.service.js';
import type { BudgetData } from '../../types/budget.types.js';

const uid = (r: Request) => (r as AuthRequest).userId;

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();
    const data  = await getBudgetWithUsage(uid(req), month, year);
    if (data.hasBudget) checkBudgetAlerts(uid(req), data as BudgetData).catch(() => {});
    res.json(data);
  } catch (err) { next(err); }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await upsertBudget(uid(req), req.body));
  } catch (err) { next(err); }
}
