import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import * as svc from './account.service.js';

const uid  = (req: Request) => (req as AuthRequest).userId;
const pid  = (req: Request) => String(req.params.id);

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await svc.getAccounts(uid(req));
    res.json({ accounts });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await svc.getAccountById(pid(req), uid(req));
    res.json({ account });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await svc.createAccount(uid(req), req.body);
    res.status(201).json({ account });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await svc.updateAccount(pid(req), uid(req), req.body);
    res.json({ account });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteAccount(pid(req), uid(req));
    res.json({ message: 'Account deleted' });
  } catch (err) { next(err); }
}
