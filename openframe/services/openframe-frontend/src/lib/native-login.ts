/**
 * Native-shell login: runs the gateway BFF OAuth flow in a system browser
 * sheet (ASWebAuthenticationSession), receives the dev-ticket on an https
 * callback the session intercepts, exchanges it natively, and puts the tokens
 * in the Keychain. Prototype flow — requires `dev-ticket-enabled` on the
 * gateway; not for production tenants.
 */
import { authApiClient } from './auth-api-client';
import { nativeAuthPlugin } from './native-shell';
import { runtimeEnv } from './runtime-config';
import { setTokens } from './token-store';

const CALLBACK_PATH = '/auth/mobile-callback';

export async function nativeLogin(options: { tenantId: string; provider?: string }): Promise<void> {
  const plugin = nativeAuthPlugin();
  if (!plugin) {
    throw new Error('Native auth plugin unavailable');
  }

  const tenantHost = runtimeEnv.tenantHostUrl();
  if (!tenantHost) {
    throw new Error('NEXT_PUBLIC_TENANT_HOST_URL is not configured');
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
}
