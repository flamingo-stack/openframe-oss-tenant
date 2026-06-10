import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { log, maskToken } from '../utils/log';

interface TokenUpdatePayload {
  /** null = the daemon's token file is gone/unreadable; drop the cache. */
  token: string | null;
}

class TokenService {
  private currentToken: string | null = null;
  private currentApiBaseUrl: string | null = null;
  private listeners: Set<(token: string) => void> = new Set();
  private apiUrlListeners: Set<(apiUrl: string) => void> = new Set();
  // In-flight dedup: several hooks request the token / API URL on mount;
  // without it each concurrent caller fires its own invoke (and log line).
  private tokenRequest: Promise<string | null> | null = null;
  private apiUrlRequest: Promise<void> | null = null;

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
        if (!token) {
          // Clear the cache so requests stop carrying a revoked token, but
          // don't notify onTokenUpdate listeners — they treat every callback
          // as "token available" (e.g. enabling queries).
          log.warn('token', 'token cleared by daemon — dropping cached token');
          this.currentToken = null;
          return;
        }
        log.info('token', `token-update event received from Rust (${maskToken(token)})`);

        this.setToken(token);
      });

      log.info('token', 'token-update listener initialized');
    } catch (error) {
      console.error('[TOKEN SERVICE] Failed to initialize token listener:', error);
    }
  }

  /**
   * Request token from Rust using Tauri command
   */
  async requestToken(): Promise<string | null> {
    if (this.currentToken) return this.currentToken;

    if (!this.tokenRequest) {
      this.tokenRequest = this.doRequestToken().finally(() => {
        this.tokenRequest = null;
      });
    }
    return this.tokenRequest;
  }

  private async doRequestToken(): Promise<string | null> {
    try {
      const token = await invoke<string | null>('get_token');

      if (token) {
        log.info('token', `requestToken success (${maskToken(token)})`);
        this.setToken(token);
        return token;
      } else {
        log.warn('token', 'requestToken returned null — falling back to cached value');
        return this.currentToken;
      }
    } catch (error) {
      log.warn('token', 'requestToken threw — falling back to cached value', String(error));
      return this.currentToken;
    }
  }

  /**
   * Refresh token from Rust, bypassing cache.
   * Used before NATS reconnection to ensure a valid token.
   */
  async refreshToken(): Promise<string | null> {
    try {
      const token = await invoke<string | null>('get_token');
      if (token) {
        log.info('token', `refreshToken success (${maskToken(token)})`);
        this.setToken(token);
        return token;
      }
      log.warn('token', 'refreshToken returned null — keeping cached value');
      return this.currentToken;
    } catch (error) {
      log.error('token', 'refreshToken failed', String(error));
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
    if (this.currentApiBaseUrl) return;

    if (!this.apiUrlRequest) {
      this.apiUrlRequest = this.doInitApiUrl().finally(() => {
        this.apiUrlRequest = null;
      });
    }
    return this.apiUrlRequest;
  }

  private async doInitApiUrl(): Promise<void> {
    try {
      const serverUrl = await invoke<string>('get_server_url');

      if (serverUrl) {
        const apiUrl = this.normalizeApiUrl(serverUrl);
        this.setApiBaseUrl(apiUrl);
        log.info('token', `api base url resolved from Rust: ${apiUrl}`);
      } else {
        log.warn('token', 'get_server_url returned empty');
      }
    } catch (error) {
      log.error('token', 'failed to get api base url from Rust', String(error));
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
