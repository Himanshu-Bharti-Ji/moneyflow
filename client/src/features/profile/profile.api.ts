import { api } from '../../lib/api';
import type { User } from '../../types';

export const profileApi = {
  updateProfile: (data: { name?: string }) =>
    api.patch<{ user: User }>('/auth/profile', data).then((r) => r.data.user),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/password', { currentPassword, newPassword }),

  updatePreferences: (data: { theme?: 'light' | 'dark' | 'system' }) =>
    api.patch<{ user: User }>('/auth/preferences', data).then((r) => r.data.user),
};
