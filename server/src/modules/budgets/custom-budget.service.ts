import mongoose from 'mongoose';
import { CustomBudget, CustomCategoryBudget } from './custom-budget.model.js';
import { Transaction } from '../transactions/transaction.model.js';
import type { CreateCustomBudgetInput } from './custom-budget.schema.js';

function statusOf(pct: number) {
  if (pct >= 120) return 'critical';
  if (pct >= 100) return 'exceeded';
  if (pct >= 80)  return 'warning';
  return 'ok';
}

/* ── Create ── */
export async function createCustomBudget(userId: string, input: CreateCustomBudgetInput) {
  const start = new Date(input.startDate + 'T00:00:00.000Z');
  const end   = new Date(input.endDate   + 'T23:59:59.999Z');

  const budget = await CustomBudget.create({
    userId,
    name:         input.name || '',
    startDate:    start,
    endDate:      end,
    overallLimit: input.overallLimit,
  });

  if (input.categoryBudgets.length > 0) {
    await CustomCategoryBudget.insertMany(
      input.categoryBudgets.map((cb) => ({
        customBudgetId: budget._id,
        userId,
        categoryId: cb.categoryId,
        limit:      cb.limit,
      }))
    );
  }

  return buildCustomBudgetResponse(userId, String(budget._id));
}

/* ── Build response with spending data ── */
async function buildCustomBudgetResponse(userId: string, budgetId: string) {
  const budget = await CustomBudget.findOne({ _id: budgetId, userId });
  if (!budget) { const e: any = new Error('Budget not found'); e.status = 404; throw e; }

  const uid   = new mongoose.Types.ObjectId(userId);
  const start = budget.startDate;
  const end   = budget.endDate;

  // Total expenses in range
  const totalExpResult = await Transaction.aggregate([
    { $match: { userId: uid, type: 'expense', date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalSpent = totalExpResult[0]?.total ?? 0;

  // Per-category expenses
  const catSpending = await Transaction.aggregate([
    { $match: { userId: uid, type: 'expense', date: { $gte: start, $lte: end }, categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', spent: { $sum: '$amount' } } },
  ]);
  const spentMap: Record<string, number> = {};
  catSpending.forEach((r) => { spentMap[String(r._id)] = r.spent; });

  const catBudgets = await CustomCategoryBudget.find({ customBudgetId: budget._id })
    .populate('categoryId', 'name color icon');

  const categoryBudgets = catBudgets.map((cb) => {
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
      status:     statusOf(pct),
    };
  });

  const overallPct = budget.overallLimit > 0 ? (totalSpent / budget.overallLimit) * 100 : 0;

  const today     = new Date();
  const daysTotal = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const daysLeft  = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86_400_000));
  const isPast    = today > end;
  const isFuture  = today < start;

  return {
    _id:               String(budget._id),
    name:              budget.name,
    startDate:         start.toISOString().split('T')[0],
    endDate:           end.toISOString().split('T')[0],
    overallLimit:      budget.overallLimit,
    totalSpent,
    overallPercentage: Math.round(overallPct),
    overallStatus:     statusOf(overallPct) as any,
    categoryBudgets,
    daysTotal,
    daysLeft,
    isActive:  !isPast && !isFuture,
    isPast,
    isFuture,
  };
}

/* ── List all custom budgets ── */
export async function listCustomBudgets(userId: string) {
  const budgets = await CustomBudget.find({ userId }).sort({ startDate: -1 });
  return Promise.all(budgets.map((b) => buildCustomBudgetResponse(userId, String(b._id))));
}

/* ── Delete ── */
export async function deleteCustomBudget(userId: string, budgetId: string) {
  const budget = await CustomBudget.findOneAndDelete({ _id: budgetId, userId });
  if (!budget) { const e: any = new Error('Budget not found'); e.status = 404; throw e; }
  await CustomCategoryBudget.deleteMany({ customBudgetId: budget._id });
  return { ok: true };
}