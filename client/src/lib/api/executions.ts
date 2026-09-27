import { apiClient } from './client.js';

export interface ExecutionStepDTO {
  id: string;
  executionId: string;
  seq: number;
  kind: 'PIPELINE' | 'NODE';
  name: string;
  nodeId?: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'WAITING';
  message: string;
  detail?: Record<string, unknown> | null;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number | null;
}

export interface WorkflowExecutionDTO {
  id: string;
  userId: string;
  workflowId?: string | null;
  origin: string;
  inputMode: string;
  rawInput?: string | null;
  language?: string | null;
  parser: string;
  confidence?: number | null;
  status: 'AWAITING_CLARIFICATION' | 'AWAITING_CONFIRMATION' | 'RUNNING' | 'WAITING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  parsed?: Record<string, unknown> | null;
  definitionSnapshot?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  error?: { code: string; message: string; nodeId?: string } | null;
  startedAt: string;
  finishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  steps?: ExecutionStepDTO[];
}

export interface ExecutionListResponse {
  data: WorkflowExecutionDTO[];
  meta: {
    nextCursor?: string;
  };
}

export const executionsApi = {
  async list(params: {
    status?: string;
    origin?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<WorkflowExecutionDTO[]> {
    return apiClient<WorkflowExecutionDTO[]>('/executions', {
      method: 'GET',
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
  },

  async getById(id: string): Promise<WorkflowExecutionDTO> {
    return apiClient<WorkflowExecutionDTO>(`/executions/${id}`, {
      method: 'GET',
    });
  },

  async cancel(id: string): Promise<WorkflowExecutionDTO> {
    return apiClient<WorkflowExecutionDTO>(`/executions/${id}/cancel`, {
      method: 'POST',
    });
  },
};
