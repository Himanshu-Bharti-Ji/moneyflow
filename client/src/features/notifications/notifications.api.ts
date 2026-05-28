import { api } from '../../lib/api';
import type { AppNotification } from '../../types';

export const notificationsApi = {
  list:       () => api.get<AppNotification[]>('/notifications').then((r) => r.data),
  unreadCount:() => api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),
  markRead:   (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead:() => api.patch('/notifications/read-all'),
  remove:     (id: string) => api.delete(`/notifications/${id}`),
  clearAll:   () => api.delete('/notifications/clear-all'),
};
