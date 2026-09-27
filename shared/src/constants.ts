export const APP_NAME = 'Voice2Flow';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const DEFAULT_CONFIRMATION_TIMEOUT_MINUTES = 10;
export const MAX_CONVERSATION_TURNS = 20;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export const TASK_CATEGORIES = ['ACADEMIC', 'PERSONAL', 'PROJECT', 'WORK', 'OTHER'] as const;
export const TASK_SOURCES = ['MANUAL', 'VOICE', 'TEXT', 'WORKFLOW'] as const;
export const AI_PROVIDERS = ['gemini', 'openai', 'anthropic', 'rules'] as const;

export const REFRESH_COOKIE_NAME = 'v2f_refresh_token';
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters long and include both letters and numbers.';
