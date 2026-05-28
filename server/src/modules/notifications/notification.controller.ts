import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import * as svc from './notification.service.js';

const uid = (r: Request) => (r as AuthRequest).userId;
const pid = (r: Request) => String(r.params.id);

export async function list(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getNotifications(uid(req))); }
  catch (err) { next(err); }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try { res.json({ count: await svc.getUnreadCount(uid(req)) }); }
  catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const n = await svc.markAsRead(uid(req), pid(req));
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json(n);
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try { await svc.markAllAsRead(uid(req)); res.json({ ok: true }); }
  catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteOne(uid(req), pid(req));
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function clearAll(req: Request, res: Response, next: NextFunction) {
  try { await svc.clearAll(uid(req)); res.json({ ok: true }); }
  catch (err) { next(err); }
}
