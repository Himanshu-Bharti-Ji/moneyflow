import mongoose from 'mongoose';
import { Transaction } from '../transactions/transaction.model.js';

export async function getReportData(userId: string, startDate: Date, endDate: Date) {
  const uid = new mongoose.Types.ObjectId(userId);

  /* ── Summary ── */
  const summaryRaw = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: startDate, $lte: endDate }, type: { $in: ['income','expense'] } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const income      = summaryRaw.find((r) => r._id === 'income')?.total  ?? 0;
  const expense     = summaryRaw.find((r) => r._id === 'expense')?.total ?? 0;
  const savings     = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  /* ── Monthly breakdown (one bar per calendar month in range) ── */
  const monthlyRaw = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: startDate, $lte: endDate }, type: { $in: ['income','expense'] } } },
    {
      $group: {
        _id:   { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Build sorted list of unique year-month pairs in range
  const monthSet = new Map<string, { year: number; month: number }>();
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cur <= last) {
    const key = `${cur.getFullYear()}-${cur.getMonth() + 1}`;
    monthSet.set(key, { year: cur.getFullYear(), month: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyBreakdown = Array.from(monthSet.values()).map(({ year, month }) => {
    const inc = monthlyRaw.find((r) => r._id.year === year && r._id.month === month && r._id.type === 'income')?.total  ?? 0;
    const exp = monthlyRaw.find((r) => r._id.year === year && r._id.month === month && r._id.type === 'expense')?.total ?? 0;
    return { name: MONTHS[month - 1], year, month, income: inc, expense: exp };
  });

  /* ── Category breakdown (expense only, top 8) ── */
  const categoryBreakdown = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: startDate, $lte: endDate }, type: 'expense', categoryId: { $ne: null } } },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: 'categories', localField: '_id', foreignField: '_id',
        as: 'cat',
      },
    },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name:  { $ifNull: ['$cat.name',  'Other'] },
        color: { $ifNull: ['$cat.color', '#94a3b8'] },
        icon:  { $ifNull: ['$cat.icon',  '📦'] },
        total: 1,
      },
    },
  ]);

  // Use actual total expense (not just top-8 sum) so percentages reflect real share of spending
  const categoryBreakdownWithPct = categoryBreakdown.map((c: any) => ({
    ...c,
    _id: String(c._id),
    percentage: expense > 0 ? Math.round((c.total / expense) * 100) : 0,
  }));

  /* ── Daily spending trend ── */
  const dailyRaw = await Transaction.aggregate([
    { $match: { userId: uid, date: { $gte: startDate, $lte: endDate }, type: { $in: ['income','expense'] } } },
    {
      $group: {
        _id:   { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.day': 1 } },
  ]);

  // Build continuous daily map
  const dayMap = new Map<string, { date: string; income: number; expense: number }>();
  const d = new Date(startDate);
  d.setHours(0,0,0,0);
  const endD = new Date(endDate);
  endD.setHours(0,0,0,0);
  while (d <= endD) {
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { date: key, income: 0, expense: 0 });
    d.setDate(d.getDate() + 1);
  }
  dailyRaw.forEach((r: any) => {
    const entry = dayMap.get(r._id.day);
    if (entry) entry[r._id.type as 'income'|'expense'] = r.total;
  });

  // For large ranges compress to weekly averages (>60 days)
  let dailyTrend = Array.from(dayMap.values());
  if (dailyTrend.length > 60) {
    // Group into weeks
    const weeks: { date: string; income: number; expense: number }[] = [];
    for (let i = 0; i < dailyTrend.length; i += 7) {
      const chunk = dailyTrend.slice(i, i + 7);
      weeks.push({
        date:    chunk[0].date,
        income:  chunk.reduce((s, x) => s + x.income,  0),
        expense: chunk.reduce((s, x) => s + x.expense, 0),
      });
    }
    dailyTrend = weeks;
  }

  return {
    summary: { income, expense, savings, savingsRate },
    monthlyBreakdown,
    categoryBreakdown: categoryBreakdownWithPct,
    dailyTrend,
  };
}
