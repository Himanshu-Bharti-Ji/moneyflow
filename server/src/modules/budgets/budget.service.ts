import mongoose from 'mongoose';
import { Budget, CategoryBudget } from './budget.model.js';
import { Transaction } from '../transactions/transaction.model.js';
import type { UpsertBudgetInput } from './budget.schema.js';

/* ── Upsert overall + category budgets ── */
export async function upsertBudget(userId: string, input: UpsertBudgetInput) {
  const { month, year, overallLimit, categoryBudgets } = input;

  // Create or update the overall budget
  const budget = await Budget.findOneAndUpdate(
    { userId, month, year },
    { $set: { overallLimit } },
    { upsert: true, new: true }
  );

  // Replace category budgets
  await CategoryBudget.deleteMany({ budgetId: budget._id });

  if (categoryBudgets.length > 0) {
    await CategoryBudget.insertMany(
      categoryBudgets.map((cb) => ({
        budgetId:   budget._id,
        userId,
        categoryId: cb.categoryId,
        limit:      cb.limit,
      }))
    );
  }

  return getBudgetWithUsage(userId, month, year);
}

/* ── Get budget + real spending ── */
export async function getBudgetWithUsage(userId: string, month: number, year: number) {
  const uid   = new mongoose.Types.ObjectId(userId);
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month,     0, 23, 59, 59, 999);

  const budget = await Budget.findOne({ userId, month, year });

  // Total expense this month
  const totalExpResult = await Transaction.aggregate([
    { $match: { userId: uid, type: 'expense', date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalSpent = totalExpResult[0]?.total ?? 0;

  // Per-category spending
  const catSpending = await Transaction.aggregate([
    { $match: { userId: uid, type: 'expense', date: { $gte: start, $lte: end }, categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', spent: { $sum: '$amount' } } },
  ]);
  const spentMap: Record<string, number> = {};
  catSpending.forEach((r) => { spentMap[String(r._id)] = r.spent; });

  // Category budgets with category info
  let categoryBudgets: any[] = [];
  if (budget) {
    const catBudgets = await CategoryBudget.find({ budgetId: budget._id })
      .populate('categoryId', 'name color icon');
    categoryBudgets = catBudgets.map((cb) => {
      const cat   = cb.categoryId as any;
      const spent = spentMap[String(cat._id)] ?? 0;
      const pct   = cb.limit > 0 ? (spent / cb.limit) * 100 : 0;
      return {
        _id:        String(cb._id),
        categoryId: String(cat._id),
        name:       cat.name,
        color:      cat.color,
        icon:       cat.icon,
        limit:      cb.limit,
        spent,
        percentage: Math.round(pct),
        status:     pct >= 120 ? 'critical' : pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok',
      };
    });
  }

  const overallLimit   = budget?.overallLimit ?? 0;
  const overallPct     = overallLimit > 0 ? (totalSpent / overallLimit) * 100 : 0;

  return {
    month, year,
    overallLimit,
    totalSpent,
    overallPercentage: Math.round(overallPct),
    overallStatus: overallPct >= 120 ? 'critical' : overallPct >= 100 ? 'exceeded' : overallPct >= 80 ? 'warning' : 'ok',
    categoryBudgets,
    hasBudget: !!budget,
  };
}
