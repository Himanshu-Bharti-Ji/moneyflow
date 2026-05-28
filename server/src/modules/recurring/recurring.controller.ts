import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { createRecurringSchema, updateRecurringSchema } from './recurring.schema.js';
import * as svc from './recurring.service.js';

const uid = (r: Request) => (r as AuthRequest).userId;
const pid = (r: Request) => String(r.params.id);

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.listRecurring(uid(req))); }
  catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createRecurringSchema.parse(req.body);
    res.status(201).json(await svc.createRecurring(uid(req), input));
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateRecurringSchema.parse(req.body);
    res.json(await svc.updateRecurring(pid(req), uid(req), input));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteRecurring(pid(req), uid(req));
    res.json({ ok: true });
  } catch (err) { next(err); }
}
