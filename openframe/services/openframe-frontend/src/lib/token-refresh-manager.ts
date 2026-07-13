/**
 * Centralized Token Refresh Manager
 *
 * Single source of truth for token refresh. Both ApiClient and AuthApiClient
 * delegate to this module.
 */

import { clearStoredTokens } from './force-logout';
import { nativeAuthPlugin } from './native-shell';
import { runtimeEnv } from './runtime-config';
import { getRefreshToken, isBearerAuthMode, setTokens } from './token-store';

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
  // Shells that implement refreshTokens own the refresh entirely: the shell
  // also refreshes for its own connections on its own schedule, and rotating
  // refresh tokens tolerate exactly one refresher. The shell resolves with the
  // stored tokens after the attempt (empty = session over) and rejects only on
  // transient failures (network), where the stored tokens remain valid.
  const plugin = nativeAuthPlugin();
  if (plugin?.refreshTokens) {
    try {
      const tokens = await plugin.refreshTokens();
      if (tokens?.accessToken) {
        await setTokens(tokens);
        return true;
      }
      clearStoredTokens();
      return false;
    } catch {
      return false;
    }
  }

  const bearerMode = isBearerAuthMode();
  const url = buildRefreshUrl(tenantId);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (bearerMode) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      headers['Refresh-Token'] = refreshToken;
    }
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

    if (bearerMode) {
      const headerAccessToken = res.headers.get('Access-Token') || res.headers.get('access-token');
      const headerRefreshToken = res.headers.get('Refresh-Token') || res.headers.get('refresh-token');

      const newAccessToken = headerAccessToken || data?.access_token || data?.accessToken || null;
      const newRefreshToken = headerRefreshToken || data?.refresh_token || data?.refreshToken || null;

      await setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
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
      const { useAuthStore } = await import('@/app/(auth)/auth/stores/auth-store');
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
