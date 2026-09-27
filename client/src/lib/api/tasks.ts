import { apiClient } from './client.js';
import {
  TaskDTO,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryFilters,
  BulkTaskActionInput,
} from '@voice2flow/shared';

export const tasksApi = {
  async listTasks(filters: Partial<TaskQueryFilters> = {}): Promise<TaskDTO[]> {
    return apiClient<TaskDTO[]>('/tasks', {
      method: 'GET',
      params: filters as Record<string, string | number | boolean | undefined | null>,
    });
  },

  async createTask(data: CreateTaskInput): Promise<TaskDTO> {
    return apiClient<TaskDTO>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTaskById(id: string): Promise<TaskDTO> {
    return apiClient<TaskDTO>(`/tasks/${id}`, {
      method: 'GET',
    });
  },

  async updateTask(id: string, data: UpdateTaskInput): Promise<TaskDTO> {
    return apiClient<TaskDTO>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async softDeleteTask(id: string): Promise<TaskDTO> {
    return apiClient<TaskDTO>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async completeTask(id: string): Promise<TaskDTO> {
    return apiClient<TaskDTO>(`/tasks/${id}/complete`, {
      method: 'POST',
    });
  },

  async reopenTask(id: string): Promise<TaskDTO> {
    return apiClient<TaskDTO>(`/tasks/${id}/reopen`, {
      method: 'POST',
    });
  },

  async restoreTask(id: string): Promise<TaskDTO> {
    return apiClient<TaskDTO>(`/tasks/${id}/restore`, {
      method: 'POST',
    });
  },

  async permanentDeleteTask(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/tasks/${id}/permanent`, {
      method: 'DELETE',
    });
  },

  async bulkAction(data: BulkTaskActionInput): Promise<{ count: number; action: string }> {
    return apiClient<{ count: number; action: string }>('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
