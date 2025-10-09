import { useState, useEffect } from 'react';
import { tokenService } from '../services/tokenService';

/**
 * React hook to access the current OpenFrame token
 * Token is automatically updated when Rust pushes new token via Tauri events
 */
export function useToken() {
  const [token, setToken] = useState<string | null>(tokenService.getCurrentToken());

  useEffect(() => {
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

