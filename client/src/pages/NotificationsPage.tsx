import { useNotifications } from '../features/notifications/useNotifications';
import { useConfirm } from '../components/ui/ConfirmProvider';
import Icon from '../components/ui/Icon';
import { toast } from '../components/ui/Toast';
import { AlertTriangle, XCircle, Siren, ArrowDownCircle, Info } from 'lucide-react';
import type { AppNotification, NotificationType } from '../types';

/* ── Icon + colour per type ── */
const TYPE_CFG: Record<NotificationType, { icon: React.ReactNode; bg: string; iconColor: string }> = {
  budget_warning:  { icon: <AlertTriangle    size={18} strokeWidth={1.75} />, bg: 'bg-amber-50',  iconColor: 'text-amber-500'  },
  budget_exceeded: { icon: <XCircle         size={18} strokeWidth={1.75} />, bg: 'bg-orange-50', iconColor: 'text-orange-500' },
  budget_critical: { icon: <Siren           size={18} strokeWidth={1.75} />, bg: 'bg-red-50',    iconColor: 'text-red-500'    },
  transaction:     { icon: <ArrowDownCircle size={18} strokeWidth={1.75} />, bg: 'bg-blue-50',   iconColor: 'text-blue-500'   },
  system:          { icon: <Info            size={18} strokeWidth={1.75} />, bg: 'bg-slate-50',  iconColor: 'text-slate-500'  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { items, loading, unread, markRead, markAllRead, remove, clearAll } = useNotifications();
  const confirm = useConfirm();

  const handleMarkAllRead = async () => {
    try { await markAllRead(); toast('All marked as read'); }
    catch { toast('Failed', 'error'); }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title:        'Clear All Notifications',
      message:      'Remove all notifications?',
      detail:       'This will permanently delete all notifications and cannot be undone.',
      confirmLabel: 'Clear All',
      danger:       true,
    });
    if (!ok) return;
    try { await clearAll(); toast('Cleared'); }
    catch { toast('Failed', 'error'); }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="btn-ghost text-xs px-3 py-1.5">
                Mark all read
              </button>
            )}
            <button onClick={handleClearAll} className="btn-ghost text-xs px-3 py-1.5 text-red-500 hover:bg-red-50">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="card text-center py-14 space-y-3">
          <p className="text-5xl">🔔</p>
          <p className="font-bold text-slate-700">No notifications yet</p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            You'll see budget alerts and important updates here.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((n) => (
            <NotificationCard
              key={n._id}
              item={n}
              onRead={() => markRead(n._id)}
              onRemove={() => remove(n._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Single notification card ── */
function NotificationCard({
  item, onRead, onRemove,
}: {
  item: AppNotification;
  onRead: () => void;
  onRemove: () => void;
}) {
  const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.system;

  return (
    <div
      className={`card flex items-start gap-3 transition-opacity cursor-pointer ${item.read ? 'opacity-60' : ''}`}
      onClick={() => { if (!item.read) onRead(); }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${item.read ? 'text-slate-500' : 'text-slate-800'}`}>
            {item.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!item.read && <span className="w-2 h-2 rounded-full bg-brand" />}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-slate-300 hover:text-red-400 transition-colors"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.message}</p>
        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(item.createdAt)}</p>
      </div>
    </div>
  );
}
