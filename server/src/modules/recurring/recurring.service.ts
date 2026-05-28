import { RecurringTransaction } from './recurring.model.js';
import type { CreateRecurringInput, UpdateRecurringInput } from './recurring.schema.js';
import type { RecurringFrequency } from './recurring.model.js';

/* ── Next due date from a given date ── */
export function nextDate(from: Date, freq: RecurringFrequency): Date {
  const d = new Date(from);
  switch (freq) {
    case 'daily':   d.setDate(d.getDate() + 1);   break;
    case 'weekly':  d.setDate(d.getDate() + 7);   break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export async function listRecurring(userId: string) {
  return RecurringTransaction.find({ userId })
    .populate('accountId',  'name color icon type')
    .populate('categoryId', 'name color icon')
    .sort({ nextDueDate: 1 });
}

export async function getRecurring(id: string, userId: string) {
  const r = await RecurringTransaction.findOne({ _id: id, userId });
  if (!r) { const e: any = new Error('Not found'); e.status = 404; throw e; }
  return r;
}

/** Parse a YYYY-MM-DD string to noon UTC so the calendar date is timezone-safe. */
function noonUTC(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00.000Z');
}

export async function createRecurring(userId: string, input: CreateRecurringInput) {
  // Use noon UTC so the stored date stays on the correct calendar day for all timezones
  const startDate = noonUTC(input.startDate);

  // Block past start dates to prevent accidental backdated auto-transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate < today) {
    const err: any = new Error('Start date cannot be in the past. Please choose today or a future date.');
    err.status = 400;
    throw err;
  }

  return RecurringTransaction.create({
    userId,
    ...input,
    categoryId:  input.categoryId || null,
    endDate:     input.endDate ? noonUTC(input.endDate) : null,
    startDate,
    nextDueDate: startDate,
  });
}

export async function updateRecurring(id: string, userId: string, input: UpdateRecurringInput) {
  const r = await RecurringTransaction.findOne({ _id: id, userId });
  if (!r) { const e: any = new Error('Not found'); e.status = 404; throw e; }

  if (input.startDate) {
    const newStart    = noonUTC(input.startDate);
    const existingStr = r.startDate.toISOString().split('T')[0];
    r.startDate = newStart;
    // Only reset nextDueDate when the start date actually changes,
    // not when the form re-sends the same value on every edit.
    if (input.startDate !== existingStr) {
      r.nextDueDate = newStart;
    }
  }
  if (input.endDate !== undefined) r.endDate    = input.endDate ? noonUTC(input.endDate) : null;
  if (input.type      !== undefined) r.type      = input.type!;
  if (input.amount    !== undefined) r.amount    = input.amount!;
  if (input.accountId !== undefined) r.accountId = input.accountId as any;
  if (input.categoryId!== undefined) r.categoryId= (input.categoryId || null) as any;
  if (input.notes     !== undefined) r.notes     = input.notes ?? '';
  if (input.frequency !== undefined) r.frequency = input.frequency!;
  if (input.isActive  !== undefined) r.isActive  = input.isActive!;

  return r.save();
}

export async function deleteRecurring(id: string, userId: string) {
  const r = await RecurringTransaction.findOneAndDelete({ _id: id, userId });
  if (!r) { const e: any = new Error('Not found'); e.status = 404; throw e; }
  return r;
}
