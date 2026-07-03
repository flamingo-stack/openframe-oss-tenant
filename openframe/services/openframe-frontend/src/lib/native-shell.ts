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
  /** Real safe-area insets from UIKit — WKWebView reports env(safe-area-inset-*) as 0 in the shell. */
  getSafeAreaInsets(): Promise<{ top: number; bottom: number; left: number; right: number }>;
}

function capacitorGlobal(): any {
  return typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
}

export function isNativeShell(): boolean {
  return capacitorGlobal()?.isNativePlatform?.() === true;
}

export function nativeAuthPlugin(): NativeAuthPlugin | null {
  return isNativeShell() ? (capacitorGlobal()?.Plugins?.NativeAuth ?? null) : null;
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
