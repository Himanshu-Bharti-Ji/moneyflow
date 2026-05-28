import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import * as svc from './category.service.js';

const uid = (req: Request) => (req as AuthRequest).userId;
const pid = (req: Request) => String(req.params.id);

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    // Seed defaults on first load
    await svc.seedDefaultCategories(uid(req));
    const categories = await svc.getCategories(uid(req));
    res.json({ categories });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await svc.createCategory(uid(req), req.body);
    res.status(201).json({ category });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await svc.updateCategory(pid(req), uid(req), req.body);
    res.json({ category });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteCategory(pid(req), uid(req));
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
}
