import { apiClient, setAccessToken } from './client.js';
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  UserDTO,
  UserSettingsDTO,
} from '@voice2flow/shared';

export const authApi = {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
    setAccessToken(res.accessToken);
    return res;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
    setAccessToken(res.accessToken);
    return res;
  },

  async refresh(): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
    });
    setAccessToken(res.accessToken);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
        skipAuth: true,
      });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<{ user: UserDTO; settings: UserSettingsDTO }> {
    return apiClient<{ user: UserDTO; settings: UserSettingsDTO }>('/auth/me', {
      method: 'GET',
    });
  },
};
