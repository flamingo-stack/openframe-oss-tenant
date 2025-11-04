import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

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
  }

  /**
   * Initialize Tauri event listener for token updates from Rust
   */
  private async initTokenListener() {
    try {
      await listen<TokenUpdatePayload>('token-update', (event) => {
        const { token } = event.payload;
        console.log('[TOKEN SERVICE] Token received from Rust event:', this.maskToken(token));
        
        this.currentToken = token;
        
        // Notify all listeners
        this.listeners.forEach(listener => {
          try {
            listener(token);
          } catch (error) {
            console.error('[TOKEN SERVICE] Error in listener:', error);
          }
        });
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
    try {
      console.log('[TOKEN SERVICE] Requesting token from Rust...');
      const token = await invoke<string | null>('get_token');
      
      if (token) {
        console.log('[TOKEN SERVICE] Token received from Rust command:', this.maskToken(token));
        this.currentToken = token;
        
        // Notify all listeners
        this.listeners.forEach(listener => {
          try {
            listener(token);
          } catch (error) {
            console.error('[TOKEN SERVICE] Error in listener:', error);
          }
        });
      } else {
        console.log('[TOKEN SERVICE] No token available yet');
      }
      
      return token;
    } catch (error) {
      console.error('[TOKEN SERVICE] Failed to request token:', error);
      return null;
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
      
      const apiUrl = serverUrl.startsWith('http://') || serverUrl.startsWith('https://') 
        ? serverUrl 
        : `https://${serverUrl}`;
      
      if (apiUrl) {
        this.currentApiBaseUrl = apiUrl;
        
        this.apiUrlListeners.forEach(listener => {
          try {
            listener(apiUrl);
          } catch (error) {
            console.error('[TOKEN SERVICE] Error in API URL listener:', error);
          }
        });
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
}

// Export singleton instance
export const tokenService = new TokenService();

