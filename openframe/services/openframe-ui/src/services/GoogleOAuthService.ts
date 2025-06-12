import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  storeOAuthState,
  getOAuthState,
  clearOAuthState 
} from '../utils/oauth';
import { AuthService, TokenResponse } from './AuthService';
import { OAuthConfigService } from '../config/oauth.config';

export interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

export interface GoogleOAuthCodeExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export class GoogleOAuthService {
  private static readonly GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static oauthConfig = OAuthConfigService.getInstance();
  private static readonly STORAGE_KEY = 'oauth_state';
  private static readonly DEBUG_KEY = 'oauth_debug';
  private static readonly CODE_VERIFIER_KEY = 'oauth_code_verifier';

  /**
   * Initiate Google OAuth login flow
   */
  static async initiateLogin(): Promise<void> {
    try {
      console.log('🚀 [GoogleOAuth] Starting OAuth flow');
      
      // Clear any previous debug info
      localStorage.removeItem(this.DEBUG_KEY);
      
      // Add debug info
      const debugInfo = {
        timestamp: new Date().toISOString(),
        action: 'initiateLogin_start',
        url: window.location.href
      };
      localStorage.setItem(this.DEBUG_KEY, JSON.stringify([debugInfo]));

      const config = this.oauthConfig.getConfig().google;
      
      // Validate configuration
      if (!config.clientId) {
        throw new Error('Google Client ID is not configured');
      }
      
      if (!config.redirectUri) {
        throw new Error('Google Redirect URI is not configured');
      }

      // Add config validation debug
      this.addDebugInfo({
        action: 'config_validated',
        clientId: config.clientId.substring(0, 20) + '...',
        redirectUri: config.redirectUri,
        scope: config.scope
      });

      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateState();

      // Store PKCE parameters
      localStorage.setItem(this.STORAGE_KEY, state);
      localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier);

      this.addDebugInfo({
        action: 'pkce_generated',
        state: state.substring(0, 10) + '...',
        codeVerifier: codeVerifier.substring(0, 10) + '...',
        codeChallenge: codeChallenge.substring(0, 10) + '...'
      });

      // Build OAuth URL with PKCE
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scope,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline'
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
      this.addDebugInfo({
        action: 'auth_url_built',
        authUrl: authUrl.substring(0, 100) + '...',
        fullParams: Object.fromEntries(params.entries())
      });

      console.log('🔗 [GoogleOAuth] Redirecting to:', authUrl);
      
      // Add final debug before redirect
      this.addDebugInfo({
        action: 'about_to_redirect',
        timestamp: new Date().toISOString()
      });

      // Redirect to Google OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('❌ [GoogleOAuth] Failed to initiate login:', error);
      
      this.addDebugInfo({
        action: 'initiate_login_error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  static async handleCallback(
    code: string, 
    state: string
  ): Promise<TokenResponse> {
    try {
      console.log('🔄 [GoogleOAuth] Processing callback');
      
      // Add callback debug info
      this.addDebugInfo({
        action: 'callback_started',
        timestamp: new Date().toISOString(),
        hasCode: !!code,
        hasState: !!state,
        url: window.location.href
      });

      // Validate state parameter
      const storedState = localStorage.getItem(this.STORAGE_KEY);
      if (!storedState || storedState !== state) {
        this.addDebugInfo({
          action: 'state_validation_failed',
          storedState: storedState?.substring(0, 10) + '...',
          receivedState: state?.substring(0, 10) + '...'
        });
        throw new Error('Invalid state parameter. Possible CSRF attack.');
      }

      // Get code verifier
      const codeVerifier = localStorage.getItem(this.CODE_VERIFIER_KEY);
      console.log('🔍 [GoogleOAuth] Code Verifier Debug:');
      console.log('  - Storage Key:', this.CODE_VERIFIER_KEY);
      console.log('  - Retrieved Code Verifier:', codeVerifier);
      console.log('  - Code Verifier Length:', codeVerifier?.length);
      console.log('  - All localStorage keys:', Object.keys(localStorage));
      
      if (!codeVerifier) {
        this.addDebugInfo({
          action: 'code_verifier_missing',
          storageKey: this.CODE_VERIFIER_KEY,
          allStorageKeys: Object.keys(localStorage)
        });
        throw new Error('Code verifier not found. Please try logging in again.');
      }

      this.addDebugInfo({
        action: 'state_and_verifier_validated',
        state: state.substring(0, 10) + '...',
        codeVerifier: codeVerifier.substring(0, 10) + '...'
      });

      // Clean up stored values
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CODE_VERIFIER_KEY);

      // Send to backend for token exchange
      console.log('🔄 [GoogleOAuth] Sending to backend for token exchange');
      
      this.addDebugInfo({
        action: 'backend_exchange_start',
        code: code.substring(0, 10) + '...'
      });

      const tokenResponse = await this.sendToBackend(code, codeVerifier);
      
      this.addDebugInfo({
        action: 'backend_exchange_success',
        hasAccessToken: !!tokenResponse.access_token,
        hasRefreshToken: !!tokenResponse.refresh_token
      });

      console.log('✅ [GoogleOAuth] Backend token exchange successful');
      return tokenResponse;
      
    } catch (error) {
      console.error('❌ [GoogleOAuth] Callback handling failed:', error);
      
      this.addDebugInfo({
        action: 'callback_error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Clean up on error
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CODE_VERIFIER_KEY);
      
      throw error;
    }
  }

  /**
   * Send OAuth data to backend for token exchange
   */
  private static async sendToBackend(
    code: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    const config = this.oauthConfig.getConfig().google;
    
    // Prepare data for backend
    const socialAuthRequest = {
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri
    };

    console.log('🔍 [GoogleOAuth] Sending to backend:');
    console.log('  - API URL:', import.meta.env.VITE_API_URL);
    console.log('  - Redirect URI:', config.redirectUri);
    console.log('  - Code Verifier Length:', codeVerifier.length);

    this.addDebugInfo({
      action: 'backend_request_prepared',
      apiUrl: import.meta.env.VITE_API_URL,
      hasCode: !!code,
      hasCodeVerifier: !!codeVerifier,
      codeVerifierLength: codeVerifier.length
    });

    const response = await fetch(`${import.meta.env.VITE_API_URL}/oauth2/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(socialAuthRequest)
    });

    this.addDebugInfo({
      action: 'backend_response_received',
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [GoogleOAuth] Backend error response:', errorData);
      
      this.addDebugInfo({
        action: 'backend_response_error',
        errorData: errorData.substring(0, 200)
      });
      throw new Error(`Backend token exchange failed: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const tokens = await response.json();
    
    this.addDebugInfo({
      action: 'backend_tokens_parsed',
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in
    });

    return tokens as TokenResponse;
  }

  private static generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    // Use base64url encoding like PKCE for consistency and URL safety
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""); // Remove padding
  }

  private static addDebugInfo(info: any): void {
    try {
      const existing = localStorage.getItem(this.DEBUG_KEY);
      const debugArray = existing ? JSON.parse(existing) : [];
      debugArray.push({
        ...info,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(this.DEBUG_KEY, JSON.stringify(debugArray));
    } catch (error) {
      console.warn('Failed to add debug info:', error);
    }
  }

  static getDebugInfo(): any[] {
    try {
      const debugInfo = localStorage.getItem(this.DEBUG_KEY);
      return debugInfo ? JSON.parse(debugInfo) : [];
    } catch (error) {
      console.warn('Failed to get debug info:', error);
      return [];
    }
  }

  static clearDebugInfo(): void {
    localStorage.removeItem(this.DEBUG_KEY);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CODE_VERIFIER_KEY);
  }

  /**
   * Check if OAuth callback URL contains error parameters
   */
  static parseCallbackError(url: string): { error: string; error_description?: string } | null {
    const urlObj = new URL(url);
    const error = urlObj.searchParams.get('error');
    
    if (error) {
      return {
        error,
        error_description: urlObj.searchParams.get('error_description') || undefined
      };
    }
    
    return null;
  }

  /**
   * Get current OAuth configuration (for debugging)
   */
  static getConfig(): GoogleOAuthConfig {
    return this.oauthConfig.getConfig().google;
  }

  /**
   * Validate configuration
   */
  static validateConfig(): boolean {
    return this.oauthConfig.validateGoogleConfig();
  }

  private static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    // Use the exact same method as your example
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""); // Only remove padding at the end
    
    return codeVerifier;
  }

  private static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    // Use the exact same method as your example
    const buffer = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""); // Only remove padding at the end
    
    return codeChallenge;
  }
} 