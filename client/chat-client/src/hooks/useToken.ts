import { useState, useEffect } from 'react';
import { tokenService } from '../services/tokenService';

/**
 * React hook to access the current OpenFrame token
 * Requests token from Rust on mount and subscribes to updates
 */
export function useToken() {
  const [token, setToken] = useState<string | null>(tokenService.getCurrentToken());

  useEffect(() => {
    // Request token from Rust immediately
    tokenService.requestToken().then((fetchedToken) => {
      if (fetchedToken) {
        setToken(fetchedToken);
      }
    });
    
    // Subscribe to token updates
    const unsubscribe = tokenService.onTokenUpdate((newToken) => {
      console.log('🔑 [useToken] Token updated in hook');
      setToken(newToken);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return token;
}

