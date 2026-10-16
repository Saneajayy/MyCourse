import { siteConfig } from '../config/site';

/**
 * Standard API error interface matching backend AppError format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public requestId?: string;
  public details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

// In-Memory Access Token Storage (Strict ADR 001 compliance - NEVER in localStorage)
let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function clearAccessToken(): void {
  memoryAccessToken = null;
}

/**
 * Performs a silent token refresh using the httpOnly cookie
 */
export async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${siteConfig.urls.api}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Sends httpOnly refresh token cookie
      });

      if (!res.ok) {
        clearAccessToken();
        return null;
      }

      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        setAccessToken(data.data.accessToken);
        return data.data.accessToken as string;
      }

      clearAccessToken();
      return null;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

/**
 * Central Typed HTTP Client for Next.js app
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${siteConfig.urls.api}/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject in-memory access token if available and not skipped
  if (!options.skipAuth && memoryAccessToken) {
    headers.set('Authorization', `Bearer ${memoryAccessToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure cross-origin cookies are transmitted
  });

  const requestId = res.headers.get('x-request-id') || undefined;

  // Handle 401 Unauthorized with silent token refresh retry
  if (res.status === 401 && !options.skipRefreshRetry && !options.skipAuth) {
    // Read response body first to inspect error code
    const clone = res.clone();
    let errorCode = '';
    try {
      const errorJson = await clone.json();
      errorCode = errorJson?.error?.code || '';
    } catch {
      // not JSON
    }

    // Crucial Phase 5/6 requirement: STREAM_SESSION_TERMINATED is a concurrency eviction, NOT an expired JWT
    if (errorCode === 'STREAM_SESSION_TERMINATED') {
      throw new ApiError(
        401,
        'STREAM_SESSION_TERMINATED',
        'You started watching on another device. Please resume here to continue.',
        requestId,
      );
    }

    // Attempt silent refresh
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      return apiClient<T>(endpoint, {
        ...options,
        headers,
        skipRefreshRetry: true, // Prevent infinite loops
      });
    }
  }

  // Handle successful response
  if (res.ok) {
    const json = await res.json();
    return (json.data !== undefined ? json.data : json) as T;
  }

  // Handle non-OK API error
  let errorData: ApiErrorResponse['error'] = {
    code: 'UNKNOWN_ERROR',
    message: `Request failed with status ${res.status}`,
    requestId,
  };

  try {
    const errorJson = await res.json();
    if (errorJson.error) {
      let message = errorJson.error.message || `Request failed with status ${res.status}`;

      // Enhance validation error messages with specific field messages
      if (
        errorJson.error.code === 'VALIDATION_ERROR' &&
        Array.isArray(errorJson.error.details) &&
        errorJson.error.details.length > 0
      ) {
        const fieldIssues = errorJson.error.details
          .map((d: any) => (d.field ? `${d.field}: ${d.message}` : d.message))
          .filter(Boolean);
        if (fieldIssues.length > 0) {
          message = fieldIssues.join(', ');
        }
      }

      errorData = {
        code: errorJson.error.code || 'UNKNOWN_ERROR',
        message,
        requestId: errorJson.error.requestId || requestId,
        details: errorJson.error.details,
      };
    }
  } catch {
    // Non-JSON response
  }

  throw new ApiError(
    res.status,
    errorData.code,
    errorData.message,
    errorData.requestId,
    errorData.details,
  );
}
