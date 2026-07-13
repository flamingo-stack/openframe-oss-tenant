/**
 * Native-shell push notifications: permission → APNs registration → device
 * token handed to the backend, and notification taps deep-linked to the
 * `route` key of the push payload (contract: openframe-mobile
 * dev/push-sample.apns). No-ops on web builds and in shells that haven't
 * installed @capacitor/push-notifications yet.
 *
 * Init runs post-login (the token PUT is an authenticated call, and the
 * permission prompt belongs after sign-in, not at launch).
 */
import { apiClient } from './api-client';
import { nativePlatform, pushNotificationsPlugin } from './native-shell';

const PUSH_TOKENS_PATH = '/api/users/me/push-tokens';
const PUSH_TOKEN_STORAGE_KEY = 'native:push-token';

let initialized = false;

export async function initNativePush(navigate: (route: string) => void): Promise<void> {
  const plugin = pushNotificationsPlugin();
  if (!plugin || initialized) return;
  initialized = true;

  // Listeners must be attached before register(): the registration event can
  // fire immediately, and iOS replays the launching notification's tap event
  // to a fresh listener on cold start.
  await plugin.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const route = notification?.data?.route;
    // Only app-internal routes — never navigate to arbitrary payload URLs.
    if (typeof route === 'string' && route.startsWith('/')) {
      navigate(route);
    }
  });

  await plugin.addListener('registration', async ({ value: token }) => {
    try {
      window.localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    } catch {
      // Best-effort: only affects logout-time deregistration.
    }
    // iOS → APNs device token, Android → FCM registration token; the backend
    // picks the delivery channel by this field.
    const res = await apiClient.put(PUSH_TOKENS_PATH, { token, platform: nativePlatform() ?? 'ios' });
    if (!res.ok) {
      console.warn('[Native Push] token registration failed:', res.status);
    }
  });

  await plugin.addListener('registrationError', error => {
    console.warn('[Native Push] APNs registration error:', error);
  });

  const { receive } = await plugin.requestPermissions();
  if (receive !== 'granted') return;

  // Register on every authenticated session start — APNs tokens rotate, and
  // the backend upsert is idempotent.
  await plugin.register();
}

/**
 * Delete this device's token server-side. Call while still authenticated
 * (before local tokens are cleared on logout).
 */
export async function unregisterNativePush(): Promise<void> {
  const plugin = pushNotificationsPlugin();
  if (!plugin) return;

  let token: string | null = null;
  try {
    token = window.localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    return;
  }
  if (!token) return;

  try {
    await apiClient.delete(`${PUSH_TOKENS_PATH}/${encodeURIComponent(token)}`);
  } catch {
    // Best-effort: the backend also prunes tokens on APNs rejection feedback.
  }
  try {
    window.localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {}
}
