import { api } from '../../lib/api';
import type { User } from '../../types';

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  me: () =>
    api.get<{ user: User }>('/auth/me').then((r) => r.data.user),
};
