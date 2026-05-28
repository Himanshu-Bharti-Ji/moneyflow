import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
  });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtSecret) as { sub: string };
}
