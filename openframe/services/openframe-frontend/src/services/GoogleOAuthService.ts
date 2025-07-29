import { ssoService } from './sso';

export class GoogleOAuthService {
  private static readonly STORAGE_KEYS = {
    CODE_VERIFIER: 'google_oauth_code_verifier',
    STATE: 'google_oauth_state'
  };

  /**
   * Initiate Google OAuth login flow
   */
  public static async initiateLogin(): Promise<void> {
    try {
      console.log('🔑 [GoogleOAuth] Starting Google OAuth flow');

      // Generate PKCE parameters
      const codeVerifier = ssoService.generateCodeVerifier();
      const state = this.generateState();

      // Store for later verification
      localStorage.setItem(this.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
      localStorage.setItem(this.STORAGE_KEYS.STATE, state);

      // Generate authorization URL
      const authUrl = await ssoService.generateGoogleAuthUrl(codeVerifier, state);

      if (!authUrl) {
        throw new Error('Google OAuth is not configured or enabled');
      }

      console.log('🚀 [GoogleOAuth] Redirecting to Google OAuth');
      console.log('🔗 [GoogleOAuth] Auth URL:', authUrl);

      // Redirect to Google OAuth
      window.location.href = authUrl;

    } catch (error) {
      console.error('❌ [GoogleOAuth] Failed to initiate login:', error);
      
      // Store error for debugging
      localStorage.setItem('oauth_initiate_error_debug', JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }));

      throw error;
    }
  }

  /**
   * Generate state parameter for OAuth
   */
  private static generateState(): string {
    return btoa(Math.random().toString(36).slice(2) + Date.now().toString(36));
  }

  /**
   * Get stored OAuth parameters
   */
  public static getStoredParams(): { codeVerifier?: string; state?: string } {
    return {
      codeVerifier: localStorage.getItem(this.STORAGE_KEYS.CODE_VERIFIER) || undefined,
      state: localStorage.getItem(this.STORAGE_KEYS.STATE) || undefined
    };
  }

  /**
   * Clear stored OAuth parameters
   */
  public static clearStoredParams(): void {
    localStorage.removeItem(this.STORAGE_KEYS.CODE_VERIFIER);
    localStorage.removeItem(this.STORAGE_KEYS.STATE);
  }
}