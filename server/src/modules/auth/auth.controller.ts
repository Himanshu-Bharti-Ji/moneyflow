import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getMe, updateProfile, changePassword, updatePreferences } from './auth.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

const uid = (r: Request) => (r as AuthRequest).userId;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await registerUser(req.body);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, token } = await loginUser(req.body);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getMe((req as AuthRequest).userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function patchProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    const user = await updateProfile(uid(req), { name });
    res.json({ user });
  } catch (err) { next(err); }
}

export async function patchPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const result = await changePassword(uid(req), currentPassword, newPassword);
    res.json(result);
  } catch (err) { next(err); }
}

export async function patchPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { theme } = req.body;
    const user = await updatePreferences(uid(req), { theme });
    res.json({ user });
  } catch (err) { next(err); }
}
