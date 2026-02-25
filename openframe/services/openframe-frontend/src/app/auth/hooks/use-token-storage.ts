import { useCallback } from 'react';

// Constants for localStorage keys
export const ACCESS_TOKEN_KEY = 'of_access_token';
export const REFRESH_TOKEN_KEY = 'of_refresh_token';

/**
 * Hook for managing token storage in localStorage
 * Uses 'of_' prefix for all OpenFrame tokens
 */
export function useTokenStorage() {
  // Store access token in localStorage
  const storeAccessToken = useCallback((token: string) => {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      console.log('🔐 [Token Storage] Access token stored');
      return true;
    } catch (error) {
      console.error('❌ [Token Storage] Failed to store access token:', error);
      return false;
    }
  }, []);

  // Store refresh token in localStorage
  const storeRefreshToken = useCallback((token: string) => {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      console.log('🔐 [Token Storage] Refresh token stored');
      return true;
    } catch (error) {
      console.error('❌ [Token Storage] Failed to store refresh token:', error);
      return false;
    }
  }, []);

  // Store both tokens from response headers
  const storeTokensFromHeaders = useCallback(
    (headers: Headers) => {
      const accessToken = headers.get('Access-Token');
      const refreshToken = headers.get('Refresh-Token');

      let stored = false;

      if (accessToken) {
        storeAccessToken(accessToken);
        stored = true;
      }

      if (refreshToken) {
        storeRefreshToken(refreshToken);
        stored = true;
      }

      if (!stored) {
        console.log('⚠️ [Token Storage] No tokens found in response headers');
      }

      return { accessToken, refreshToken };
    },
    [storeAccessToken, storeRefreshToken],
  );

  // Get access token from localStorage
  const getAccessToken = useCallback(() => {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('❌ [Token Storage] Failed to get access token:', error);
      return null;
    }
  }, []);

  // Get refresh token from localStorage
  const getRefreshToken = useCallback(() => {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('❌ [Token Storage] Failed to get refresh token:', error);
      return null;
    }
  }, []);

  // Clear all tokens from localStorage
  const clearTokens = useCallback(() => {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      console.log('🔐 [Token Storage] Tokens cleared');
      return true;
    } catch (error) {
      console.error('❌ [Token Storage] Failed to clear tokens:', error);
      return false;
    }
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
