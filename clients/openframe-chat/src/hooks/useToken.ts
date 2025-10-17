import { useState, useEffect } from 'react';
import { tokenService } from '../services/tokenService';

/**
 * React hook to access the current OpenFrame token
 * Requests token from Rust on mount and subscribes to updates
 */
export function useToken() {
  const [token, setToken] = useState<string | null>(tokenService.getCurrentToken());

  useEffect(() => {
    console.log('🎬 [useToken] Hook mounted');
    
    // Request token from Rust immediately on mount
    tokenService.requestToken().then((fetchedToken) => {
      if (fetchedToken) {
        console.log('[useToken] Initial token received:', fetchedToken.substring(0, 20) + '...');
        setToken(fetchedToken);
      } else {
        console.log('[useToken] No token available yet');
      }
    });
    
    // Subscribe to token updates
    const unsubscribe = tokenService.onTokenUpdate((newToken) => {
      console.log('[useToken] Token updated in hook:', newToken.substring(0, 20) + '...');
      setToken(newToken);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return token;
}

