import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pos_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('pos_token'),
  isLoading: true,

  setAuth: (token, user) => {
    localStorage.setItem('pos_token', token);
    const finalUser = { ...user };
    if (user.roles && user.roles.length > 0) {
      localStorage.setItem('pos_user_roles', JSON.stringify(user.roles));
    } else {
      const cachedRoles = localStorage.getItem('pos_user_roles');
      if (cachedRoles) {
        try {
          finalUser.roles = JSON.parse(cachedRoles);
        } catch (e) {
          console.error('Failed to parse cached roles:', e);
        }
      }
    }
    set({ token, user: finalUser, isAuthenticated: true, isLoading: false });
  },

  updateUser: (user) => {
    set({ user });
  },

  clearAuth: () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user_roles');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));
