import mongoose from 'mongoose';
import { Account } from './account.model.js';
import { Transaction } from '../transactions/transaction.model.js';
import type { CreateAccountInput, UpdateAccountInput } from './account.schema.js';

export async function getAccounts(userId: string) {
  return Account.find({ userId }).sort({ createdAt: 1 });
}

export async function getAccountById(id: string, userId: string) {
  const account = await Account.findOne({ _id: id, userId });
  if (!account) {
    const err: any = new Error('Account not found');
    err.status = 404;
    throw err;
  }
  return account;
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  return Account.create({
    userId,
    ...input,
    currentBalance: input.openingBalance,
  });
}

export async function updateAccount(id: string, userId: string, input: UpdateAccountInput) {
  const account = await Account.findOneAndUpdate(
    { _id: id, userId },
    { $set: input },
    { new: true }
  );
  if (!account) {
    const err: any = new Error('Account not found');
    err.status = 404;
    throw err;
  }
  return account;
}

export async function deleteAccount(id: string, userId: string) {
  // Check both as source account AND as transfer destination
  const txCount = await Transaction.countDocuments({
    userId,
    $or: [{ accountId: id }, { transferAccountId: id }],
  });
  if (txCount > 0) {
    const err: any = new Error(
      `Cannot delete: this account is used in ${txCount} transaction${txCount !== 1 ? 's' : ''}. Delete those transactions first.`
    );
    err.status = 409;
    throw err;
  }

  const account = await Account.findOneAndDelete({ _id: id, userId });
  if (!account) {
    const err: any = new Error('Account not found');
    err.status = 404;
    throw err;
  }
  return account;
}

export async function getTotalBalance(userId: string) {
  const result = await Account.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$currentBalance' } } },
  ]);
  return result[0]?.total ?? 0;
}
