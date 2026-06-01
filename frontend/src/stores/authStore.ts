import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, role: 'USER' | 'ADMIN') => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('notifyx_token'),
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      localStorage.setItem('notifyx_token', token);
      set({ token, user, loading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to sign in',
        loading: false,
      });
      return false;
    }
  },

  register: async (email, password, role) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', { email, password, role });
      const { token, user } = response.data.data;
      localStorage.setItem('notifyx_token', token);
      set({ token, user, loading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Registration failed',
        loading: false,
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('notifyx_token');
    set({ token: null, user: null, error: null });
  },

  checkAuth: async () => {
    const { token } = get();
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const response = await apiClient.get('/auth/me');
      set({ user: response.data.data.user, loading: false });
    } catch (err) {
      // Token is invalid/expired
      localStorage.removeItem('notifyx_token');
      set({ token: null, user: null, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
