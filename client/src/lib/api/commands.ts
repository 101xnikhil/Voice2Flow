import { apiClient } from './client.js';
import {
  CommandRequest,
  CommandResponse,
  CommandConfirm,
  CommandResolve,
} from '@voice2flow/shared';

export const commandsApi = {
  async execute(request: CommandRequest): Promise<CommandResponse> {
    return apiClient<CommandResponse>('/commands', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  async confirm(executionId: string, overrides?: Record<string, unknown>): Promise<CommandResponse> {
    const payload: CommandConfirm = { overrides };
    return apiClient<CommandResponse>(`/commands/${executionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancel(executionId: string): Promise<{ status: string; executionId: string }> {
    return apiClient<{ status: string; executionId: string }>(`/commands/${executionId}/cancel`, {
      method: 'POST',
    });
  },

  async resolve(
    executionId: string,
    optionId?: string,
    answer?: string
  ): Promise<CommandResponse> {
    const payload: CommandResolve = { optionId, answer };
    return apiClient<CommandResponse>(`/commands/${executionId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
