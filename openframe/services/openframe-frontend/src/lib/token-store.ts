/**
 * Single client-side custody point for OAuth tokens.
 *
 * Web builds keep the legacy behavior exactly: tokens exist in localStorage
 * only in dev-ticket (bearer) mode; cookie mode stores nothing client-side.
 * Native-shell builds persist tokens in the iOS Keychain (NativeAuth plugin)
 * and mirror them in module memory because many callers (fetch interceptors,
 * WebSocket URL builders) need synchronous reads.
 */
import { isNativeShell, nativeAuthPlugin, onNativeTokenUpdate } from './native-shell';
import { runtimeEnv } from './runtime-config';

export const ACCESS_TOKEN_KEY = 'of_access_token';
export const REFRESH_TOKEN_KEY = 'of_refresh_token';

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let hydration: Promise<void> | null = null;

/** Bearer-header auth is used instead of cookies: dev-ticket web mode, or always in the native shell. */
export function isBearerAuthMode(): boolean {
  return isNativeShell() || runtimeEnv.enableDevTicketObserver();
}

/** Hydrate the in-memory cache from the Keychain (native only). Safe to call repeatedly. */
export function initTokenStore(): Promise<void> {
  if (!hydration) {
    hydration = (async () => {
      if (!isNativeShell()) return;
      // Shells with a shell-side refresher rotate tokens while the webview is
      // idle — mirror every rotation into the cache. The event carries the
      // full stored set, so an empty payload means the session is over.
      onNativeTokenUpdate(tokens => {
        cachedAccessToken = tokens.accessToken || null;
        cachedRefreshToken = tokens.refreshToken || null;
      });
      try {
        const tokens = await nativeAuthPlugin()?.getTokens();
        cachedAccessToken = tokens?.accessToken || null;
        cachedRefreshToken = tokens?.refreshToken || null;
      } catch (error) {
        console.error('[Token Store] Keychain hydration failed:', error);
      }
    })();
  }
  return hydration;
}

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Synchronous read: the Keychain-hydrated memory cache on native, localStorage
 * on the web. Before native hydration completes this returns null — callers on
 * that path recover via the 401 -> refresh -> retry flow (refresh awaits hydration).
 */
export function getAccessTokenSync(): string | null {
  return isNativeShell() ? cachedAccessToken : readLocalStorage(ACCESS_TOKEN_KEY);
}

export function getRefreshTokenSync(): string | null {
  return isNativeShell() ? cachedRefreshToken : readLocalStorage(REFRESH_TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  await initTokenStore();
  return getAccessTokenSync();
}

export async function getRefreshToken(): Promise<string | null> {
  await initTokenStore();
  return getRefreshTokenSync();
}

/** Store whichever tokens are present (rotation responses may carry one or both). */
export async function setTokens(tokens: { accessToken?: string | null; refreshToken?: string | null }): Promise<void> {
  const { accessToken, refreshToken } = tokens;
  if (isNativeShell()) {
    await initTokenStore();
    if (accessToken) cachedAccessToken = accessToken;
    if (refreshToken) cachedRefreshToken = refreshToken;
    try {
      await nativeAuthPlugin()?.setTokens({
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
      });
    } catch (error) {
      console.error('[Token Store] Keychain write failed:', error);
    }
    return;
  }
  if (typeof window === 'undefined') return;
  try {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('[Token Store] Failed to store tokens:', error);
  }
}

export async function clearTokens(): Promise<void> {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  if (isNativeShell()) {
    try {
      await nativeAuthPlugin()?.clearTokens();
    } catch (error) {
      console.error('[Token Store] Keychain clear failed:', error);
    }
    return;
  }
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[Token Store] Failed to clear tokens:', error);
  }
}

export function hasTokensSync(): boolean {
  return !!(getAccessTokenSync() || getRefreshTokenSync());
}
