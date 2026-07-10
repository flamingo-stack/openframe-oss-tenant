import { clearMingoContext } from '@/app/(app)/mingo/stores/mingo-context-store';
import { authApiClient } from '@/lib/auth-api-client';
import { isNativeShell } from '@/lib/native-shell';
import { runtimeEnv } from '@/lib/runtime-config';
import { clearTokens, isBearerAuthMode } from '@/lib/token-store';
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
  // Clear the user's Mingo working context so it can't leak into the next
  // session on a shared browser (it's persisted in localStorage + rides out on
  // every Mingo message).
  clearMingoContext();
  if (isBearerAuthMode()) {
    // Awaited: in the native shell this is an async Keychain clear, and the
    // navigation below must not race it.
    await clearTokens();
  }

  if (isNativeShell()) {
    // An external navigation would bounce to the system browser. Reload the
    // SPA root instead — with tokens cleared it boots to the sign-in screen.
    window.location.href = '/';
    return;
  }

  // After an explicit Log Out the user goes straight to the Login tab.
  const sharedHostUrl = runtimeEnv.sharedHostUrl();
  if (sharedHostUrl) {
    window.location.href = `${sharedHostUrl}/auth/login`;
  } else {
    window.location.href = '/auth/login';
  }
}
