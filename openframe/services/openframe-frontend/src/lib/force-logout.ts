import { getDefaultRedirectPath, isSaasTenantMode } from './app-mode';
import { clearTokens, hasTokensSync } from './token-store';

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
    await clearTokens();
  } catch (error) {
    console.error('[Force Logout] Failed to clear tokens:', error);
  }

  try {
    const { useAuthStore } = await import('@/app/(auth)/auth/stores/auth-store');
    const { logout } = useAuthStore.getState();
    logout();
  } catch (error) {
    console.error('[Force Logout] Failed to clear auth store:', error);
  }

  // Clear the user's Mingo working context (persisted `recentViews` + the live
  // store) so it can't leak into the next session. Dynamic import mirrors the
  // auth-store one above — keeps the mingo feature out of this low-level module's
  // static graph. In SaaS-tenant mode this path returns WITHOUT a reload below,
  // so resetting the in-memory store here (not just localStorage) matters.
  try {
    const { clearMingoContext } = await import('@/app/(app)/mingo/stores/mingo-context-store');
    clearMingoContext();
  } catch (error) {
    console.error('[Force Logout] Failed to clear Mingo context:', error);
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
  return hasTokensSync();
}

export function clearStoredTokens(): void {
  void clearTokens();
}
