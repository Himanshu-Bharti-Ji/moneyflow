import mongoose from 'mongoose';
import { Transaction } from './transaction.model.js';
import { Account }     from '../accounts/account.model.js';
import type { CreateTransactionInput, UpdateTransactionInput, ListTransactionQuery } from './transaction.schema.js';

/* ── Balance helpers ── */
async function applyBalance(
  accountId: string, amount: number, type: 'income'|'expense'|'transfer',
  side: 'from'|'to', session: mongoose.ClientSession
) {
  const delta = (type === 'income' || (type === 'transfer' && side === 'to'))
    ? amount : -amount;
  await Account.findByIdAndUpdate(accountId, { $inc: { currentBalance: delta } }, { session });
}

async function reverseBalance(
  accountId: string, amount: number, type: 'income'|'expense'|'transfer',
  side: 'from'|'to', session: mongoose.ClientSession
) {
  if (type === 'transfer') {
    // Swap side: reverse 'from' by treating as 'to' (+amount) and vice-versa (-amount)
    return applyBalance(accountId, amount, 'transfer', side === 'from' ? 'to' : 'from', session);
  }
  return applyBalance(accountId, amount, type === 'income' ? 'expense' : 'income', side, session);
}

/* ── Create ── */
export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [tx] = await Transaction.create([{ userId, ...input }], { session });

    if (input.type === 'transfer') {
      await applyBalance(input.accountId,         input.amount, 'transfer', 'from', session);
      await applyBalance(input.transferAccountId!, input.amount, 'transfer', 'to',   session);
    } else {
      await applyBalance(input.accountId, input.amount, input.type, 'from', session);
    }

    await session.commitTransaction();
    return tx;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/* ── List ── */
export async function listTransactions(userId: string, q: ListTransactionQuery) {
  const filter: any = { userId };
  if (q.type)       filter.type       = q.type;
  if (q.accountId)  filter.accountId  = q.accountId;
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.startDate || q.endDate) {
    filter.date = {};
    if (q.startDate) filter.date.$gte = new Date(q.startDate + 'T00:00:00.000Z');
    if (q.endDate)   filter.date.$lte = new Date(q.endDate   + 'T23:59:59.999Z');
  }
  if (q.search)     filter.notes = { $regex: q.search, $options: 'i' };
  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    filter.amount = {};
    if (q.minAmount !== undefined) filter.amount.$gte = q.minAmount;
    if (q.maxAmount !== undefined) filter.amount.$lte = q.maxAmount;
  }

  const skip  = (q.page - 1) * q.limit;
  const total = await Transaction.countDocuments(filter);
  const data  = await Transaction.find(filter)
    .populate('accountId',  'name color icon type')
    .populate('categoryId', 'name color icon type')
    .populate('transferAccountId', 'name color icon')
    .sort({ date: -1 })
    .skip(skip)
    .limit(q.limit);

  return { data, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
}

/* ── Get one ── */
export async function getTransaction(id: string, userId: string) {
  const tx = await Transaction.findOne({ _id: id, userId })
    .populate('accountId',         'name color icon type')
    .populate('categoryId',        'name color icon type')
    .populate('transferAccountId', 'name color icon');
  if (!tx) { const e: any = new Error('Transaction not found'); e.status = 404; throw e; }
  return tx;
}

/* ── Update ── */
export async function updateTransaction(id: string, userId: string, input: UpdateTransactionInput) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const old = await Transaction.findOne({ _id: id, userId }).session(session);
    if (!old) { const e: any = new Error('Transaction not found'); e.status = 404; throw e; }

    if (input.amount !== undefined && input.amount !== old.amount) {
      // Reverse old, apply new
      if (old.type === 'transfer') {
        await reverseBalance(String(old.accountId),          old.amount, 'transfer', 'from', session);
        await reverseBalance(String(old.transferAccountId!), old.amount, 'transfer', 'to',   session);
        await applyBalance(String(old.accountId),            input.amount, 'transfer', 'from', session);
        await applyBalance(String(old.transferAccountId!),   input.amount, 'transfer', 'to',   session);
      } else {
        await reverseBalance(String(old.accountId), old.amount,   old.type, 'from', session);
        await applyBalance(String(old.accountId),   input.amount, old.type, 'from', session);
      }
    }

    const tx = await Transaction.findOneAndUpdate(
      { _id: id, userId }, { $set: input }, { new: true, session }
    );

    await session.commitTransaction();
    return tx;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/* ── Delete ── */
export async function deleteTransaction(id: string, userId: string) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tx = await Transaction.findOne({ _id: id, userId }).session(session);
    if (!tx) { const e: any = new Error('Transaction not found'); e.status = 404; throw e; }

    if (tx.type === 'transfer') {
      await reverseBalance(String(tx.accountId),          tx.amount, 'transfer', 'from', session);
      await reverseBalance(String(tx.transferAccountId!), tx.amount, 'transfer', 'to',   session);
    } else {
      await reverseBalance(String(tx.accountId), tx.amount, tx.type, 'from', session);
    }

    await tx.deleteOne({ session });
    await session.commitTransaction();
    return tx;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/* ── Monthly summary (used by dashboard) ── */
export async function getMonthlySummary(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month,     0, 23, 59, 59);

  const result = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end }, type: { $in: ['income','expense'] } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const income  = result.find((r) => r._id === 'income')?.total  ?? 0;
  const expense = result.find((r) => r._id === 'expense')?.total ?? 0;
  return { income, expense, savings: income - expense };
}
