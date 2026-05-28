import bcrypt from 'bcryptjs';
import { User } from '../users/user.model.js';
import { signToken } from '../../utils/jwt.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    const err: any = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const token = signToken(String(user._id));
  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) {
    const err: any = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    const err: any = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = signToken(String(user._id));
  return { user, token };
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
}

export async function updateProfile(userId: string, data: { name?: string }) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!user) { const e: any = new Error('User not found'); e.status = 404; throw e; }
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) { const e: any = new Error('User not found'); e.status = 404; throw e; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { const e: any = new Error('Current password is incorrect'); e.status = 400; throw e; }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  return { ok: true };
}

export async function updatePreferences(userId: string, data: { theme?: 'light' | 'dark' | 'system' }) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!user) { const e: any = new Error('User not found'); e.status = 404; throw e; }
  return user;
}
