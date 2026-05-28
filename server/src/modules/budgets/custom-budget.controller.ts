import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { createCustomBudget, listCustomBudgets, deleteCustomBudget } from './custom-budget.service.js';

const uid = (r: Request) => (r as AuthRequest).userId;

export async function listCustom(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listCustomBudgets(uid(req))); }
  catch (err) { next(err); }
}

export async function createCustom(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await createCustomBudget(uid(req), req.body)); }
  catch (err) { next(err); }
}

export async function removeCustom(req: Request, res: Response, next: NextFunction) {
  try { res.json(await deleteCustomBudget(uid(req), req.params.id)); }
  catch (err) { next(err); }
}