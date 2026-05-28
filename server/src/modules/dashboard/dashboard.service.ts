import mongoose from 'mongoose';
import { Transaction } from '../transactions/transaction.model.js';
import { Account }     from '../accounts/account.model.js';

export async function getDashboardData(userId: string, month: number, year: number) {
  const uid   = new mongoose.Types.ObjectId(userId);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month,     0, 23, 59, 59, 999);

  /* ── Total balance across all accounts ── */
  const balanceResult = await Account.aggregate([
    { $match: { userId: uid } },
    { $group: { _id: null, total: { $sum: '$currentBalance' } } },
  ]);
  const totalBalance = balanceResult[0]?.total ?? 0;

  /* ── Monthly income / expense ── */
  const monthlyResult = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: start, $lte: end }, type: { $in: ['income', 'expense'] } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const income  = monthlyResult.find((r) => r._id === 'income')?.total  ?? 0;
  const expense = monthlyResult.find((r) => r._id === 'expense')?.total ?? 0;
  const savings = income - expense;

  /* ── 6-month trend ── */
  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });

  const trendStart = new Date(trendMonths[0].year, trendMonths[0].month - 1, 1);
  const trendEnd   = end;

  const trendRaw = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: trendStart, $lte: trendEnd }, type: { $in: ['income','expense'] } } },
    {
      $group: {
        _id: { month: { $month: '$date' }, year: { $year: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const trend = trendMonths.map(({ month: m, year: y }) => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const inc = trendRaw.find((r) => r._id.month === m && r._id.year === y && r._id.type === 'income')?.total  ?? 0;
    const exp = trendRaw.find((r) => r._id.month === m && r._id.year === y && r._id.type === 'expense')?.total ?? 0;
    return { name: monthNames[m - 1], income: inc, expense: exp };
  });

  /* ── Category breakdown (expense this month) ── */
  const categoryBreakdown = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: start, $lte: end }, type: 'expense', categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 6 },
    {
      $lookup: {
        from: 'categories', localField: '_id', foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name:  { $ifNull: ['$category.name',  'Other'] },
        color: { $ifNull: ['$category.color', '#94a3b8'] },
        icon:  { $ifNull: ['$category.icon',  '📦'] },
        value: '$total',
      },
    },
  ]);

  /* ── Recent transactions (last 5) ── */
  const recent = await Transaction.find({ userId: uid })
    .populate('accountId',  'name color icon')
    .populate('categoryId', 'name color icon')
    .sort({ date: -1 })
    .limit(5);

  return { totalBalance, income, expense, savings, trend, categoryBreakdown, recent };
}
