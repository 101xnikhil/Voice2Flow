import { create } from 'zustand';
import { authApi } from '../lib/api/auth.js';
import {
  UserDTO,
  UserSettingsDTO,
  LoginInput,
  RegisterInput,
} from '@voice2flow/shared';

interface AuthState {
  user: UserDTO | null;
  settings: UserSettingsDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;

  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  updateUser: (user: Partial<UserDTO>) => void;
  updateSettings: (settings: Partial<UserSettingsDTO>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  settings: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,
  error: null,

  login: async (input: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(input);
      set({
        user: res.user,
        settings: res.settings,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      set({
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  register: async (input: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(input);
      set({
        user: res.user,
        settings: res.settings,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      set({
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } finally {
      set({
        user: null,
        settings: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  restoreSession: async () => {
    set({ isRestoring: true });
    try {
      const res = await authApi.refresh();
      if (res && res.user) {
        set({
          user: res.user,
          settings: res.settings,
          isAuthenticated: true,
          isRestoring: false,
        });
        return true;
      }
    } catch {
      // Silent failure on session restore is normal (e.g. user is logged out)
    }
    set({
      user: null,
      settings: null,
      isAuthenticated: false,
      isRestoring: false,
    });
    return false;
  },

  updateUser: (updated: Partial<UserDTO>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updated } });
    }
  },

  updateSettings: (updated: Partial<UserSettingsDTO>) => {
    const current = get().settings;
    if (current) {
      set({ settings: { ...current, ...updated } });
    }
  },

  clearError: () => set({ error: null }),
}));
