import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import * as svc from './transaction.service.js';

const uid = (r: Request) => (r as AuthRequest).userId;
const pid = (r: Request) => String(r.params.id);

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listTransactions(uid(req), req.query as any);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ transaction: await svc.getTransaction(pid(req), uid(req)) });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const tx = await svc.createTransaction(uid(req), req.body);
    res.status(201).json({ transaction: tx });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const tx = await svc.updateTransaction(pid(req), uid(req), req.body);
    res.json({ transaction: tx });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTransaction(pid(req), uid(req));
    res.json({ message: 'Transaction deleted' });
  } catch (err) { next(err); }
}

export async function monthlySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();
    res.json(await svc.getMonthlySummary(uid(req), month, year));
  } catch (err) { next(err); }
}
