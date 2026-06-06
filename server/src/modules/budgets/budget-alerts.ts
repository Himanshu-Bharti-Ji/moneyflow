import { getBudgetWithUsage }           from './budget.service.js';
import { getActiveCustomBudgetsForDate } from './custom-budget.service.js';
import { checkBudgetAlerts, checkCustomBudgetAlerts } from '../notifications/notification.service.js';
import type { BudgetData } from '../../types/budget.types.js';

/**
 * Called fire-and-forget after any expense transaction is created.
 * Checks monthly and all active custom budgets covering the transaction date,
 * and generates deduped notifications for any warning/exceeded/critical status.
 */
export async function triggerBudgetAlertsForDate(userId: string, txDate: Date): Promise<void> {
  const month = txDate.getUTCMonth() + 1;
  const year  = txDate.getUTCFullYear();

  // Monthly budget
  try {
    const data = await getBudgetWithUsage(userId, month, year);
    if (data.hasBudget) await checkBudgetAlerts(userId, data as BudgetData);
  } catch { /* non-blocking */ }

  // Active custom budgets covering this date
  try {
    const customs = await getActiveCustomBudgetsForDate(userId, txDate);
    for (const cb of customs) {
      await checkCustomBudgetAlerts(userId, cb);
    }
  } catch { /* non-blocking */ }
}
