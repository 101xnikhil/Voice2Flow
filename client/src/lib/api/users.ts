import { apiClient } from './client.js';
import {
  UserDTO,
  UserSettingsDTO,
  SessionDTO,
  UpdateUserInput,
  UpdateUserSettingsInput,
  ChangePasswordInput,
  DeleteAccountInput,
} from '@voice2flow/shared';

export const usersApi = {
  async getMe(): Promise<{ user: UserDTO; settings: UserSettingsDTO }> {
    return apiClient<{ user: UserDTO; settings: UserSettingsDTO }>('/users/me');
  },

  async updateMe(data: UpdateUserInput): Promise<{ user: UserDTO }> {
    return apiClient<{ user: UserDTO }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async changePassword(data: ChangePasswordInput): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/users/me/password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSettings(): Promise<UserSettingsDTO> {
    return apiClient<UserSettingsDTO>('/users/me/settings');
  },

  async updateSettings(data: UpdateUserSettingsInput): Promise<UserSettingsDTO> {
    return apiClient<UserSettingsDTO>('/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getSessions(): Promise<SessionDTO[]> {
    return apiClient<SessionDTO[]>('/users/me/sessions');
  },

  async revokeSession(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/users/me/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteAccount(data: DeleteAccountInput): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/users/me', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  },
};
