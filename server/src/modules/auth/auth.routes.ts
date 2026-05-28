import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, patchProfile, patchPassword, patchPreferences } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { registerSchema, loginSchema } from './auth.schema.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later.' },
});

authRouter.post('/register', authLimiter, validate(registerSchema), register);
authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.get('/me',                requireAuth, me);
authRouter.patch('/profile',         requireAuth, patchProfile);
authRouter.patch('/password',        requireAuth, patchPassword);
authRouter.patch('/preferences',     requireAuth, patchPreferences);
