/**
 * Native-shell login: runs the gateway BFF OAuth flow in a system browser
 * sheet (ASWebAuthenticationSession), receives the dev-ticket on an https
 * callback the session intercepts, exchanges it natively, and puts the tokens
 * in the Keychain. Prototype flow — requires `dev-ticket-enabled` on the
 * gateway; not for production tenants.
 */
import { authApiClient } from './auth-api-client';
import { nativeAuthPlugin, storeTenantHost } from './native-shell';
import { runtimeEnv } from './runtime-config';
import { setTokens } from './token-store';

const CALLBACK_PATH = '/auth/mobile-callback';

export interface NativeLoginResult {
  /**
   * True when the callback landed on a different host than the one the app
   * booted with (first login of a host-less build, or a tenant change). The
   * learned host is already persisted, but module-level state may still hold
   * the old value — callers should do a full navigation instead of an SPA
   * route so every client re-initializes against the new host.
   */
  tenantHostChanged: boolean;
}

export async function nativeLogin(options: {
  tenantId: string;
  provider?: string;
  tenantDomain?: string;
}): Promise<NativeLoginResult> {
  const plugin = nativeAuthPlugin();
  if (!plugin) {
    throw new Error('Native auth plugin unavailable');
  }

  const discoveredHost = options.tenantDomain
    ? options.tenantDomain.startsWith('http')
      ? options.tenantDomain
      : `https://${options.tenantDomain}`
    : '';
  const bootHost = runtimeEnv.tenantHostUrl();
  const tenantHost = discoveredHost || bootHost;
  if (!tenantHost) {
    throw new Error(
      'No tenant host available — discovery returned no domain and NEXT_PUBLIC_TENANT_HOST_URL is not configured',
    );
  }

  // The BFF only accepts http(s) redirect targets, so the callback is an https
  // URL on the tenant host; the auth session intercepts it before navigation.
  const callbackUrl = `${tenantHost}${CALLBACK_PATH}`;
  const rawLoginUrl = authApiClient.loginUrl(options.tenantId, encodeURIComponent(callbackUrl), options.provider);
  const loginUrl = rawLoginUrl.startsWith('http') ? rawLoginUrl : `${tenantHost}${rawLoginUrl}`;

  const { callbackUrl: resultUrl } = await plugin.start({
    url: loginUrl,
    callbackHost: new URL(callbackUrl).hostname,
    callbackPath: CALLBACK_PATH,
  });

  const ticket = new URL(resultUrl).searchParams.get('devTicket');
  if (!ticket) {
    throw new Error('Login completed without a ticket — is dev-ticket enabled on the gateway?');
  }

  const exchangeBase = runtimeEnv.sharedHostUrl() || tenantHost;
  const { accessToken, refreshToken } = await plugin.exchangeTicket({
    url: `${exchangeBase}/oauth/dev-exchange?ticket=${encodeURIComponent(ticket)}`,
  });

  if (!accessToken && !refreshToken) {
    throw new Error('Ticket exchange returned no tokens');
  }

  await setTokens({ accessToken, refreshToken });

  const learnedHost = new URL(resultUrl).origin;
  storeTenantHost(learnedHost);
  // Also persist it shell-side: the shell refreshes tokens (and later runs
  // background NATS) with its own networking, which must not depend on
  // webview localStorage.
  try {
    await plugin.setTenantHost?.({ origin: learnedHost });
  } catch {
    // Optional capability — older shells (mobile) don't implement it.
  }

  return { tenantHostChanged: learnedHost !== bootHost.replace(/\/$/, '') };
}
