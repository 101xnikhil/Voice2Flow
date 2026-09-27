import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_CATEGORIES,
  TASK_SOURCES,
  AI_PROVIDERS,
} from './constants.js';

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskSource = (typeof TASK_SOURCES)[number];
export type AIProviderName = (typeof AI_PROVIDERS)[number];

export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsDTO {
  id: string;
  userId: string;
  theme: string;
  sttLocale: string;
  autoExecute: boolean;
  autoExecuteThreshold: number;
  autoExecuteWorkflows: boolean;
  showConfidence: boolean;
  defaultReminderOffsetMin: number;
  weekStartsOn: number;
  notifyBrowser: boolean;
  notifyEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDTO {
  id: string;
  userAgent?: string | null;
  ip?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  isCurrent?: boolean;
}

export interface TaskDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  isAllDay: boolean;
  estimatedMinutes: number | null;
  personName: string | null;
  location: string | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  completedAt: string | null;
  deletedAt: string | null;
  source: TaskSource;
  executionId: string | null;
  originKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserDTO;
  settings: UserSettingsDTO;
  accessToken: string;
}
