import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from './notifications.api';
import type { AppNotification } from '../../types';

export function useNotifications() {
  const [items,   setItems]   = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await notificationsApi.list());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const remove = async (id: string) => {
    await notificationsApi.remove(id);
    setItems((prev) => prev.filter((n) => n._id !== id));
  };

  const clearAll = async () => {
    await notificationsApi.clearAll();
    setItems([]);
  };

  return { items, loading, unread, markRead, markAllRead, remove, clearAll, refresh: load };
}

/* ── Lightweight hook just for the bell badge ── */
export function useUnreadCount() {
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    try { setCount(await notificationsApi.unreadCount()); }
    catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30_000);
    // Refresh immediately when an expense is recorded (fired by AddTransactionPage)
    window.addEventListener('mf:refresh-notifications', fetch);
    return () => {
      clearInterval(id);
      window.removeEventListener('mf:refresh-notifications', fetch);
    };
  }, [fetch]);

  return { count, refresh: fetch };
}
