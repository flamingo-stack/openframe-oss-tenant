import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/app/auth/hooks/use-token-storage';
import { getDefaultRedirectPath, isSaasTenantMode } from './app-mode';

export interface ForceLogoutOptions {
  reason?: string;
  shouldRedirect?: boolean;
  redirectPath?: string;
}

export async function forceLogout(options: ForceLogoutOptions = {}): Promise<void> {
  const { shouldRedirect = true, redirectPath } = options;

  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname;
  const isAuthPage = currentPath.startsWith('/auth');

  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[Force Logout] Failed to clear tokens from localStorage:', error);
  }

  try {
    const { useAuthStore } = await import('../app/auth/stores/auth-store');
    const { logout } = useAuthStore.getState();
    logout();
  } catch (error) {
    console.error('[Force Logout] Failed to clear auth store:', error);
  }

  if (shouldRedirect && !isAuthPage) {
    if (isSaasTenantMode()) {
      return;
    }
    try {
      const targetPath = redirectPath || getDefaultRedirectPath(false);
      window.location.href = targetPath;
    } catch (_error) {
      window.location.href = '/auth';
    }
  }
}

export function hasStoredTokens(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return !!(accessToken || refreshToken);
  } catch {
    return false;
  }
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[Token Clear] Failed to clear tokens:', error);
  }
}
