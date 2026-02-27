/**
 * Centralized Token Refresh Manager
 *
 * Single source of truth for token refresh. Both ApiClient and AuthApiClient
 * delegate to this module.
 */

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/app/auth/hooks/use-token-storage';
import { clearStoredTokens } from './force-logout';
import { runtimeEnv } from './runtime-config';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function buildRefreshUrl(tenantId?: string): string {
  const base = runtimeEnv.sharedHostUrl();
  const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  const path = `/oauth/refresh${query}`;
  if (!base) return path;
  return `${base}${path}`;
}

async function executeRefresh(tenantId?: string): Promise<boolean> {
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();
  const url = buildRefreshUrl(tenantId);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (isDevTicketEnabled) {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        headers['Refresh-Token'] = refreshToken;
      }
    } catch {}
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearStoredTokens();
      }
      return false;
    }

    let data: any;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {}
    }

    if (isDevTicketEnabled) {
      const headerAccessToken = res.headers.get('Access-Token') || res.headers.get('access-token');
      const headerRefreshToken = res.headers.get('Refresh-Token') || res.headers.get('refresh-token');

      const newAccessToken = headerAccessToken || data?.access_token || data?.accessToken || null;
      const newRefreshToken = headerRefreshToken || data?.refresh_token || data?.refreshToken || null;

      if (newAccessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      }
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Refresh the access token. Deduplicates concurrent calls —
 * if a refresh is already in progress, returns the existing promise.
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const { useAuthStore } = await import('../app/auth/stores/auth-store');
      const authState = useAuthStore.getState();
      const tenantId =
        authState.tenantId || (authState.user as any)?.organizationId || (authState.user as any)?.tenantId;

      return await executeRefresh(tenantId || undefined);
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Check if a refresh is currently in progress
 */
export function isTokenRefreshing(): boolean {
  return isRefreshing;
}

/**
 * Wait for any in-progress refresh to complete
 */
export async function waitForRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }
  return false;
}
