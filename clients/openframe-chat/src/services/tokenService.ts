import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface TokenUpdatePayload {
  token: string;
}

class TokenService {
  private currentToken: string | null = null;
  private currentApiBaseUrl: string | null = null;
  private listeners: Set<(token: string) => void> = new Set();
  private apiUrlListeners: Set<(apiUrl: string) => void> = new Set();

  constructor() {
    this.initTokenListener();
    this.initApiUrl();

    this.initFromEnv();
  }

  private normalizeApiUrl(serverUrl: string): string {
    const trimmed = serverUrl.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
  }

  private initFromEnv() {
    const token = import.meta.env.VITE_TOKEN as string | undefined;
    const serverUrl = import.meta.env.VITE_SERVER_URL as string | undefined;

    if (serverUrl && !this.currentApiBaseUrl) {
      this.setApiBaseUrl(this.normalizeApiUrl(serverUrl));
    }
    if (token && !this.currentToken) {
      this.setToken(token);
    }
  }

  private setToken(token: string) {
    this.currentToken = token;
    this.listeners.forEach(listener => {
      try {
        listener(token);
      } catch (error) {
        console.error('[TOKEN SERVICE] Error in listener:', error);
      }
    });
  }

  private setApiBaseUrl(apiUrl: string) {
    this.currentApiBaseUrl = apiUrl;
    this.apiUrlListeners.forEach(listener => {
      try {
        listener(apiUrl);
      } catch (error) {
        console.error('[TOKEN SERVICE] Error in API URL listener:', error);
      }
    });
  }

  /**
   * Initialize Tauri event listener for token updates from Rust
   */
  private async initTokenListener() {
    try {
      await listen<TokenUpdatePayload>('token-update', event => {
        const { token } = event.payload;
        console.log('[TOKEN SERVICE] Token received from Rust event:', this.maskToken(token));

        this.setToken(token);
      });

      console.log('[TOKEN SERVICE] Token listener initialized');
    } catch (error) {
      console.error('[TOKEN SERVICE] Failed to initialize token listener:', error);
    }
  }

  /**
   * Request token from Rust using Tauri command
   */
  async requestToken(): Promise<string | null> {
    if (this.currentToken) return this.currentToken;

    try {
      console.log('[TOKEN SERVICE] Requesting token from Rust...');
      const token = await invoke<string | null>('get_token');

      if (token) {
        console.log('[TOKEN SERVICE] Token received from Rust command:', this.maskToken(token));
        this.setToken(token);
        return token;
      } else {
        return this.currentToken;
      }
    } catch (_error) {
      return this.currentToken;
    }
  }

  /**
   * Refresh token from Rust, bypassing cache.
   * Used before NATS reconnection to ensure a valid token.
   */
  async refreshToken(): Promise<string | null> {
    try {
      console.log('[TOKEN SERVICE] Refreshing token from Rust...');
      const token = await invoke<string | null>('get_token');
      if (token) {
        console.log('[TOKEN SERVICE] Token refreshed:', this.maskToken(token));
        this.setToken(token);
        return token;
      }
      return this.currentToken;
    } catch (error) {
      console.error('[TOKEN SERVICE] Failed to refresh token:', error);
      return this.currentToken;
    }
  }

  /**
   * Get the current token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Subscribe to token updates
   * @param callback Function to call when token updates
   * @returns Unsubscribe function
   */
  onTokenUpdate(callback: (token: string) => void): () => void {
    this.listeners.add(callback);

    // If we already have a token, call the callback immediately
    if (this.currentToken) {
      try {
        callback(this.currentToken);
      } catch (error) {
        console.error('[TOKEN SERVICE] Error in immediate callback:', error);
      }
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Initialize API base URL from Tauri
   */
  async initApiUrl() {
    try {
      const serverUrl = await invoke<string>('get_server_url');

      if (serverUrl) {
        const apiUrl = this.normalizeApiUrl(serverUrl);
        this.setApiBaseUrl(apiUrl);
      }
    } catch (error) {
      console.error('[TOKEN SERVICE] Failed to get API base URL:', error);
    }
  }

  /**
   * Get the current API base URL
   */
  getCurrentApiBaseUrl(): string | null {
    return this.currentApiBaseUrl;
  }

  /**
   * Subscribe to API base URL updates
   * @param callback Function to call when API URL updates
   * @returns Unsubscribe function
   */
  onApiUrlUpdate(callback: (apiUrl: string) => void): () => void {
    this.apiUrlListeners.add(callback);

    if (this.currentApiBaseUrl) {
      try {
        callback(this.currentApiBaseUrl);
      } catch (error) {
        console.error('[TOKEN SERVICE] Error in immediate API URL callback:', error);
      }
    }

    return () => {
      this.apiUrlListeners.delete(callback);
    };
  }

  /**
   * Mask token for logging (show first and last 4 characters)
   */
  private maskToken(token: string): string {
    if (token.length <= 8) {
      return '****';
    }

    const first = token.substring(0, 4);
    const last = token.substring(token.length - 4);
    return `${first}...${last}`;
  }

  async ensureTokenReady(): Promise<void> {
    let token = this.getCurrentToken();

    if (!token) {
      token = await this.requestToken();

      if (!token) {
        throw new Error('Authentication token not available.');
      }
    }

    let apiUrl = this.getCurrentApiBaseUrl();
    if (!apiUrl) {
      await this.initApiUrl();
      apiUrl = this.getCurrentApiBaseUrl();

      if (!apiUrl) {
        throw new Error('API server URL not configured.');
      }
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();
