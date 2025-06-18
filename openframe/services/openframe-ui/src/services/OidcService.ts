import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState, 
  storeOAuthState,
  getOAuthState,
  clearOAuthState 
} from '../utils/oauth';
import { AuthService, TokenResponse } from './AuthService';
import { restClient } from '../apollo/apolloClient';

export interface OidcConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  issuer: string;
}

export interface OidcCodeExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export class OidcService {
  private static readonly STORAGE_KEY = 'oidc_state';
  private static readonly DEBUG_KEY = 'oidc_debug';
  private static readonly CODE_VERIFIER_KEY = 'oidc_code_verifier';

  /**
   * Initiate OIDC login flow
   */
  static async initiateLogin(): Promise<void> {
    try {
      console.log('🚀 [OIDC] Starting OIDC flow');
      
      // Clear any previous debug info
      localStorage.removeItem(this.DEBUG_KEY);
      
      // Add debug info
      const debugInfo = {
        timestamp: new Date().toISOString(),
        action: 'initiateLogin_start',
        url: window.location.href
      };
      localStorage.setItem(this.DEBUG_KEY, JSON.stringify([debugInfo]));

      // Get OIDC configuration from backend
      const config = await this.getOidcConfig();
      
      // Validate configuration
      if (!config.clientId) {
        throw new Error('OIDC Client ID is not configured');
      }
      
      if (!config.redirectUri) {
        throw new Error('OIDC Redirect URI is not configured');
      }

      if (!config.issuer) {
        throw new Error('OIDC Issuer is not configured');
      }

      // Add config validation debug
      this.addDebugInfo({
        action: 'config_validated',
        clientId: config.clientId.substring(0, 20) + '...',
        redirectUri: config.redirectUri,
        scope: config.scope,
        issuer: config.issuer
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
        code_challenge_method: 'S256'
      });

      const authUrl = `${config.issuer}/auth?${params.toString()}`;
      
      this.addDebugInfo({
        action: 'auth_url_built',
        authUrl: authUrl.substring(0, 100) + '...',
        fullParams: Object.fromEntries(params.entries())
      });

      console.log('🔗 [OIDC] Redirecting to:', authUrl);
      
      // Add final debug before redirect
      this.addDebugInfo({
        action: 'about_to_redirect',
        timestamp: new Date().toISOString()
      });

      // Redirect to OIDC provider
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('❌ [OIDC] Failed to initiate login:', error);
      
      this.addDebugInfo({
        action: 'initiate_login_error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Handle OIDC callback and exchange code for tokens
   */
  static async handleCallback(
    code: string, 
    state: string
  ): Promise<TokenResponse> {
    try {
      console.log('🔄 [OIDC] Processing callback');
      
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
      console.log('🔍 [OIDC] Code Verifier Debug:');
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
      console.log('🔄 [OIDC] Sending to backend for token exchange');
      
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

      console.log('✅ [OIDC] Backend token exchange successful');
      return tokenResponse;
      
    } catch (error) {
      console.error('❌ [OIDC] Callback handling failed:', error);
      
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
   * Get OIDC configuration from backend
   */
  private static async getOidcConfig(): Promise<OidcConfig> {
    console.log('🔍 [OIDC] Fetching OIDC configuration from backend');
    
    this.addDebugInfo({
      action: 'config_fetch_start',
      apiUrl: import.meta.env.VITE_API_URL
    });

    try {
      const config = await restClient.get<OidcConfig>(`${import.meta.env.VITE_API_URL}/oidc/config`);
      
      this.addDebugInfo({
        action: 'config_fetch_success',
        hasClientId: !!config.clientId,
        hasRedirectUri: !!config.redirectUri,
        hasIssuer: !!config.issuer
      });

      console.log('✅ [OIDC] Configuration fetched successfully');
      return config;
    } catch (error) {
      console.error('❌ [OIDC] Failed to fetch OIDC configuration:', error);
      
      this.addDebugInfo({
        action: 'config_fetch_error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new Error(`Failed to fetch OIDC configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send OAuth data to backend for token exchange
   */
  private static async sendToBackend(
    code: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    // Get configuration first to get redirect URI
    const config = await this.getOidcConfig();
    
    // Prepare data for backend
    const oidcAuthRequest = {
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri
    };

    console.log('🔍 [OIDC] Sending to backend:');
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

    try {
      const tokens = await restClient.post<TokenResponse>(`${import.meta.env.VITE_API_URL}/oidc/callback`, oidcAuthRequest);
      
      this.addDebugInfo({
        action: 'backend_tokens_parsed',
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in
      });

      return tokens;
    } catch (error) {
      console.error('❌ [OIDC] Backend error response:', error);
      
      this.addDebugInfo({
        action: 'backend_response_error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new Error(`Backend token exchange failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * Check if OIDC callback URL contains error parameters
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