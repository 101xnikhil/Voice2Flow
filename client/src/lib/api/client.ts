import { API_PREFIX } from '@voice2flow/shared';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
}

export class AppError extends Error {
  public code: string;
  public details?: Record<string, string[]>;
  public requestId?: string;
  public status: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || 'An error occurred');
    this.name = 'AppError';
    this.status = status;
    this.code = payload.code || 'UNKNOWN_ERROR';
    this.details = payload.details;
    this.requestId = payload.requestId;
  }
}

// In-memory access token storage
let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const json = await response.json();
      const token = json.data?.accessToken || null;
      setAccessToken(token);
      return token;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, params, ...fetchOptions } = options;

  let url = `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth && inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // If 401 unauthorized, attempt silent refresh once
  if (response.status === 401 && !skipAuth && !path.includes('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });
    }
  }

  let data: unknown = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  const parsed = data as { error?: ApiErrorPayload; data?: T } | null;

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = parsed?.error || {
      code: 'HTTP_ERROR',
      message: response.statusText || 'An unexpected error occurred',
    };
    throw new AppError(response.status, errorPayload);
  }

  return (parsed?.data !== undefined ? parsed.data : (data as T));
}
