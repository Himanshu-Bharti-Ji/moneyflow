import { Notification } from './notification.model.js';
import type { NotificationType } from './notification.model.js';
import type { BudgetData } from '../../types/budget.types.js';

/* ── Generic create (used by workers / other modules) ── */
export async function createNotification(data: {
  userId:    string;
  type:      NotificationType;
  title:     string;
  message:   string;
  metadata?: Record<string, any>;
}) {
  return Notification.create(data);
}

export async function getNotifications(userId: string) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
}

export async function getUnreadCount(userId: string) {
  return Notification.countDocuments({ userId, read: false });
}

export async function markAsRead(userId: string, id: string) {
  return Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
}

export async function markAllAsRead(userId: string) {
  return Notification.updateMany({ userId, read: false }, { read: true });
}

export async function deleteOne(userId: string, id: string) {
  return Notification.findOneAndDelete({ _id: id, userId });
}

export async function clearAll(userId: string) {
  return Notification.deleteMany({ userId });
}

/* ── Budget alert dedup helper ── */
export async function checkBudgetAlerts(userId: string, data: BudgetData) {
  const { month, year, overallStatus, overallPercentage, overallLimit, totalSpent, categoryBudgets } = data;

  // Overall budget checks
  if (overallStatus !== 'ok') {
    const dedupKey = `overall-${month}-${year}-${overallStatus}`;
    const exists = await Notification.findOne({ userId, 'metadata.dedupKey': dedupKey });
    if (!exists) {
      const statusMeta = alertMeta(overallStatus, overallPercentage);
      await Notification.create({
        userId,
        type:    statusMeta.type,
        title:   `Overall Budget ${statusMeta.label}`,
        message: `You've used ${overallPercentage}% of your ₹${overallLimit.toLocaleString('en-IN')} budget this month (₹${totalSpent.toLocaleString('en-IN')} spent).`,
        metadata: { dedupKey, month, year, scope: 'overall' },
      });
    }
  }

  // Category budget checks
  for (const cb of categoryBudgets) {
    if (cb.status !== 'ok') {
      const dedupKey = `cat-${cb.categoryId}-${month}-${year}-${cb.status}`;
      const exists = await Notification.findOne({ userId, 'metadata.dedupKey': dedupKey });
      if (!exists) {
        const statusMeta = alertMeta(cb.status, cb.percentage);
        await Notification.create({
          userId,
          type:    statusMeta.type,
          title:   `${cb.name} Budget ${statusMeta.label}`,
          message: `You've used ${cb.percentage}% of your ${cb.name} budget this month (₹${cb.spent.toLocaleString('en-IN')} / ₹${cb.limit.toLocaleString('en-IN')}).`,
          metadata: { dedupKey, month, year, scope: 'category', categoryId: cb.categoryId, categoryName: cb.name },
        });
      }
    }
  }
}

function alertMeta(status: string, pct: number) {
  if (status === 'critical')  return { type: 'budget_critical'  as const, label: 'Critical'  };
  if (status === 'exceeded')  return { type: 'budget_exceeded'  as const, label: 'Exceeded'  };
  return                             { type: 'budget_warning'   as const, label: 'Warning'   };
}

/* ── Custom budget alert dedup helper ── */
export async function checkCustomBudgetAlerts(userId: string, data: {
  _id:               string;
  name:              string;
  startDate:         string;
  endDate:           string;
  overallLimit:      number;
  totalSpent:        number;
  overallPercentage: number;
  overallStatus:     string;
  categoryBudgets:   Array<{
    _id:        string;
    categoryId: string;
    name:       string;
    spent:      number;
    limit:      number;
    percentage: number;
    status:     string;
  }>;
}) {
  const label = data.name || `${data.startDate} – ${data.endDate}`;

  if (data.overallStatus !== 'ok') {
    const dedupKey = `custom-overall-${data._id}-${data.overallStatus}`;
    const exists   = await Notification.findOne({ userId, 'metadata.dedupKey': dedupKey });
    if (!exists) {
      const sm = alertMeta(data.overallStatus, data.overallPercentage);
      await Notification.create({
        userId,
        type:     sm.type,
        title:    `Budget "${label}" ${sm.label}`,
        message:  `You've used ${data.overallPercentage}% of your ₹${data.overallLimit.toLocaleString('en-IN')} budget (₹${data.totalSpent.toLocaleString('en-IN')} spent).`,
        metadata: { dedupKey, budgetId: data._id, scope: 'custom-overall' },
      });
    }
  }

  for (const cb of data.categoryBudgets) {
    if (cb.status !== 'ok') {
      const dedupKey = `custom-cat-${data._id}-${cb.categoryId}-${cb.status}`;
      const exists   = await Notification.findOne({ userId, 'metadata.dedupKey': dedupKey });
      if (!exists) {
        const sm = alertMeta(cb.status, cb.percentage);
        await Notification.create({
          userId,
          type:     sm.type,
          title:    `${cb.name} Budget ${sm.label}`,
          message:  `You've used ${cb.percentage}% of your ${cb.name} budget in "${label}" (₹${cb.spent.toLocaleString('en-IN')} / ₹${cb.limit.toLocaleString('en-IN')}).`,
          metadata: { dedupKey, budgetId: data._id, scope: 'custom-category', categoryId: cb.categoryId },
        });
      }
    }
  }
}
