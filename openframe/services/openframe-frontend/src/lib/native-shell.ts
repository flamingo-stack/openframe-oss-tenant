/**
 * Detection of, and typed access to, the Capacitor native shell (openframe-mobile).
 * The shell injects `window.Capacitor` at runtime; this web app deliberately has
 * no Capacitor npm dependency, so all bridge access goes through these helpers.
 */

export interface NativeAuthPlugin {
  /** Runs the OAuth login in an ASWebAuthenticationSession; resolves with the final callback URL. */
  start(options: { url: string; callbackHost: string; callbackPath: string }): Promise<{ callbackUrl: string }>;
  /** Performs the dev-ticket exchange over native HTTP (no CORS) and returns tokens from response headers. */
  exchangeTicket(options: { url: string }): Promise<{ accessToken?: string; refreshToken?: string }>;
  getTokens(): Promise<{ accessToken?: string; refreshToken?: string }>;
  setTokens(options: { accessToken?: string; refreshToken?: string }): Promise<void>;
  clearTokens(): Promise<void>;
  /**
   * Shell-owned refresh (single-flight in the shell). Optional — shells that
   * implement it become the ONLY refresher: refresh tokens rotate, so the
   * webview must not race a shell-side refresher with its own /oauth/refresh.
   * Resolves with the stored tokens after the attempt (empty = session over);
   * rejects on transient failure. Implemented by the desktop (Tauri) shell;
   * the mobile Swift plugin not yet.
   */
  refreshTokens?(): Promise<{ accessToken?: string; refreshToken?: string }>;
  /**
   * Persist the login-learned tenant host in the shell, so shell-side
   * networking (token refresh, background NATS) has a gateway without
   * depending on webview localStorage. Optional, desktop-only for now.
   */
  setTenantHost?(options: { origin: string }): Promise<void>;
  /** Real safe-area insets from UIKit — WKWebView reports env(safe-area-inset-*) as 0 in the shell. */
  getSafeAreaInsets(): Promise<{ top: number; bottom: number; left: number; right: number }>;
}

export type PushPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

/** Subset of @capacitor/push-notifications used by this app (plugin ships with the shell, not npm). */
export interface PushNotificationsPlugin {
  checkPermissions(): Promise<{ receive: PushPermissionState }>;
  requestPermissions(): Promise<{ receive: PushPermissionState }>;
  register(): Promise<void>;
  addListener(eventName: 'registration', listenerFunc: (token: { value: string }) => void): Promise<unknown>;
  addListener(eventName: 'registrationError', listenerFunc: (error: unknown) => void): Promise<unknown>;
  addListener(
    eventName: 'pushNotificationActionPerformed',
    listenerFunc: (action: { notification: { data?: Record<string, unknown> } }) => void,
  ): Promise<unknown>;
}

function capacitorGlobal(): any {
  return typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
}

export function isNativeShell(): boolean {
  return capacitorGlobal()?.isNativePlatform?.() === true;
}

/** `'ios' | 'android'` inside the shell, null on the web. */
export function nativePlatform(): 'ios' | 'android' | null {
  if (!isNativeShell()) return null;
  const platform = capacitorGlobal()?.getPlatform?.();
  return platform === 'ios' || platform === 'android' ? platform : null;
}

export function nativeAuthPlugin(): NativeAuthPlugin | null {
  return isNativeShell() ? (capacitorGlobal()?.Plugins?.NativeAuth ?? null) : null;
}

/** Null until @capacitor/push-notifications is installed in the shell — callers no-op. */
export function pushNotificationsPlugin(): PushNotificationsPlugin | null {
  return isNativeShell() ? (capacitorGlobal()?.Plugins?.PushNotifications ?? null) : null;
}

const TENANT_HOST_STORAGE_KEY = 'native:tenant-host-url';

/**
 * Tenant host the shell learned at login time: the OAuth callback lands on the
 * tenant's canonical host (resolved server-side from the tenant registry), so
 * one binary can serve any tenant without a build-time
 * NEXT_PUBLIC_TENANT_HOST_URL. localStorage survives shell restarts and is
 * synchronous, so the value is available to module-load-time readers.
 */
export function getStoredTenantHost(): string | null {
  if (!isNativeShell()) return null;
  try {
    return window.localStorage.getItem(TENANT_HOST_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeTenantHost(origin: string): void {
  if (!isNativeShell() || !origin) return;
  try {
    window.localStorage.setItem(TENANT_HOST_STORAGE_KEY, origin);
  } catch {
    // Best-effort: the next login learns the host again.
  }
}

/**
 * Subscribe to shell-pushed token rotations. The desktop shell refreshes
 * tokens on its own schedule (the webview may be idle) and emits the full
 * token set after every change — including an empty set when the session is
 * over. Tauri-only transport; no-op in shells without it (Capacitor mobile).
 */
export function onNativeTokenUpdate(callback: (tokens: { accessToken?: string; refreshToken?: string }) => void): void {
  if (!isNativeShell()) return;
  const tauriEvent = (window as any).__TAURI__?.event;
  if (typeof tauriEvent?.listen !== 'function') return;
  void tauriEvent.listen('native-auth:token-update', (event: any) => callback(event?.payload ?? {}));
}

/**
 * Subscribe to OS-toast clicks forwarded by the desktop shell's Rust
 * notification plane. The payload is the raw NATS notification envelope —
 * resolve a route with resolveNatsNotificationRoute. Tauri-only transport;
 * no-op in shells without it.
 */
export function onNativeNotificationClick(callback: (payload: unknown) => void): void {
  if (!isNativeShell()) return;
  const tauriEvent = (window as any).__TAURI__?.event;
  if (typeof tauriEvent?.listen !== 'function') return;
  void tauriEvent.listen('notification:click', (event: any) => callback(event?.payload));
}

/**
 * Publish the native safe-area insets as CSS variables consumed by the
 * shell-scoped rules in globals.css (`--native-safe-top/-bottom`).
 */
export async function applyNativeSafeAreas(): Promise<void> {
  try {
    const insets = await nativeAuthPlugin()?.getSafeAreaInsets();
    if (!insets) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--native-safe-top', `${insets.top}px`);
    rootStyle.setProperty('--native-safe-bottom', `${insets.bottom}px`);
  } catch (error) {
    console.warn('[Native Shell] safe-area inset lookup failed:', error);
  }
}
