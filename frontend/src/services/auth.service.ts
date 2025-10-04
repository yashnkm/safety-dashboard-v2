import api from './api.ts';
import type { LoginCredentials, LoginResponse } from '@/types/auth.types.ts';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
