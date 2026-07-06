import { useCallback } from 'react';
import { clearTokens as clearAllTokens, getAccessTokenSync, getRefreshTokenSync, setTokens } from '@/lib/token-store';

// Re-exported for existing consumers; the storage itself lives in token-store.
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/token-store';

/**
 * Hook facade over the token store (`src/lib/token-store.ts`), kept for
 * existing consumers. Tokens go to the iOS Keychain in the native shell and
 * to localStorage on the web (dev-ticket mode).
 */
export function useTokenStorage() {
  const storeAccessToken = useCallback(async (token: string) => {
    await setTokens({ accessToken: token });
    return true;
  }, []);

  const storeRefreshToken = useCallback(async (token: string) => {
    await setTokens({ refreshToken: token });
    return true;
  }, []);

  // Store both tokens from response headers
  const storeTokensFromHeaders = useCallback(async (headers: Headers) => {
    const accessToken = headers.get('Access-Token');
    const refreshToken = headers.get('Refresh-Token');

    if (accessToken || refreshToken) {
      await setTokens({ accessToken, refreshToken });
    } else {
      console.log('⚠️ [Token Storage] No tokens found in response headers');
    }

    return { accessToken, refreshToken };
  }, []);

  const getAccessToken = useCallback(() => getAccessTokenSync(), []);

  const getRefreshToken = useCallback(() => getRefreshTokenSync(), []);

  const clearTokens = useCallback(async () => {
    await clearAllTokens();
    return true;
  }, []);

  return {
    storeAccessToken,
    storeRefreshToken,
    storeTokensFromHeaders,
    getAccessToken,
    getRefreshToken,
    clearTokens,
  };
}
