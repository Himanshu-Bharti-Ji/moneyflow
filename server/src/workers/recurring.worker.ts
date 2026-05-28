import cron from 'node-cron';
import { RecurringTransaction } from '../modules/recurring/recurring.model.js';
import { nextDate }             from '../modules/recurring/recurring.service.js';
import { createTransaction }    from '../modules/transactions/transaction.service.js';
import { createNotification }   from '../modules/notifications/notification.service.js';

/* ── In-memory lock prevents concurrent runs (e.g. startup + cron overlap) ── */
let isProcessing = false;

/* ── Process all due recurring transactions ── */
async function processDue() {
  if (isProcessing) {
    console.log('[recurring] already running, skipping this trigger');
    return;
  }
  isProcessing = true;

  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // treat "today" as end-of-day so we catch everything due today

    const due = await RecurringTransaction.find({
      isActive:    true,
      nextDueDate: { $lte: today },
    });

    if (due.length) console.log(`[recurring] processing ${due.length} recurring rule(s)`);

    for (const r of due) {
      try {
        // Process all missed periods in one pass (catches up after downtime)
        let processingDate = new Date(r.nextDueDate);
        let catchUpCount   = 0;
        const MAX_CATCHUP  = 366; // safety cap: at most 1 year of daily transactions

        while (processingDate <= today && catchUpCount < MAX_CATCHUP) {
          // Stop if past end date
          if (r.endDate && processingDate > r.endDate) {
            r.isActive = false;
            break;
          }

          await createTransaction(String(r.userId), {
            type:       r.type,
            amount:     r.amount,
            accountId:  String(r.accountId),
            categoryId: r.categoryId ? String(r.categoryId) : undefined,
            notes:      r.notes || 'Recurring transaction',
            date:       processingDate,
          });

          r.lastProcessedDate = processingDate;
          processingDate      = nextDate(processingDate, r.frequency);
          catchUpCount++;
        }

        // Notify user (once per rule, even if multiple periods were caught up)
        if (catchUpCount > 0) {
          const missedNote = catchUpCount > 1 ? ` (${catchUpCount} periods caught up)` : '';
          await createNotification({
            userId:  String(r.userId),
            type:    'transaction',
            title:   'Recurring Transaction Processed',
            message: `₹${r.amount.toLocaleString('en-IN')} ${r.type} auto-created.${missedNote}`,
            metadata: { recurringId: String(r._id) },
          });
        }

        r.nextDueDate = processingDate;

        // Deactivate if new nextDueDate is past endDate
        if (r.endDate && r.nextDueDate > r.endDate) r.isActive = false;

        await r.save();
        console.log(`[recurring] processed: ${r.type} ₹${r.amount} (${r.frequency}) — ${catchUpCount} period(s)`);
      } catch (err: any) {
        console.error(`[recurring] failed for ${r._id}:`, err.message);
      }
    }
  } finally {
    isProcessing = false;
  }
}

/* ── Start the cron job — 00:05 IST every day ── */
export function startRecurringWorker() {
  // Run once on startup to catch missed transactions from downtime
  processDue().catch((e) => console.error('[recurring] startup run failed:', e.message));

  // Schedule at 00:05 in IST (Asia/Kolkata) explicitly
  cron.schedule('5 0 * * *', () => {
    processDue().catch((e) => console.error('[recurring] cron failed:', e.message));
  }, { timezone: 'Asia/Kolkata' });

  console.log('[recurring] worker started (IST timezone)');
}
