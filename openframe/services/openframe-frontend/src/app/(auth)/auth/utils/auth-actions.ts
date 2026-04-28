import { authApiClient } from '@/lib/auth-api-client';
import { clearStoredTokens } from '@/lib/force-logout';
import { runtimeEnv } from '@/lib/runtime-config';
import { useAuthStore } from '../stores/auth-store';

/**
 * Standalone logout function that can be called without the full useAuth hook.
 * Useful in components like AppShell that only need logout capability.
 */
export async function performLogout() {
  const { tenantId, user, logout: storeLogout } = useAuthStore.getState();
  const effectiveTenantId = tenantId || user?.tenantId || user?.organizationId;

  if (effectiveTenantId) {
    await authApiClient.logoutAsync(effectiveTenantId);
  }

  storeLogout();
  if (runtimeEnv.enableDevTicketObserver()) {
    clearStoredTokens();
  }

  const sharedHostUrl = runtimeEnv.sharedHostUrl();
  if (sharedHostUrl) {
    window.location.href = `${sharedHostUrl}/auth`;
  } else {
    window.location.href = '/auth';
  }
}
