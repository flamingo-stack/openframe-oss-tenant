export interface SSOConfigStatus {
  provider: string;
  enabled: boolean;
  clientId?: string;
}

export interface SSOProviderInfo {
  provider: string;
  displayName: string;
  available: boolean;
}

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8080';
};

export class SSOService {
  private static readonly BASE_URL = '/sso';

  /**
   * Get enabled SSO providers for login buttons
   * Returns list of enabled providers
   */
  public async getEnabledProviders(): Promise<SSOConfigStatus[]> {
    try {
      const response = await fetch(`${getApiUrl()}${SSOService.BASE_URL}/providers`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enabled providers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching enabled SSO providers:', error);
      return [];
    }
  }

  /**
   * Get available SSO providers for admin dropdowns
   * Returns all providers that have strategy implementations
   */
  public async getAvailableProviders(): Promise<SSOProviderInfo[]> {
    try {
      const response = await fetch(`${getApiUrl()}${SSOService.BASE_URL}/providers/available`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available providers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching available SSO providers:', error);
      return [];
    }
  }

  /**
   * Get SSO configuration status for OAuth login buttons
   * Returns minimal info about whether SSO is enabled
   */
  public async getConfigStatus(provider: string): Promise<SSOConfigStatus> {
    try {
      const response = await fetch(`${getApiUrl()}${SSOService.BASE_URL}/${provider}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch SSO config status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching SSO config status for ${provider}:`, error);
      return {
        provider,
        enabled: false
      };
    }
  }

  /**
   * Generate redirect URI for OAuth provider
   */
  public generateRedirectUri(provider: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/oauth2/callback/${provider}`;
  }

  /**
   * Generate Google OAuth authorization URL
   */
  public async generateGoogleAuthUrl(codeVerifier: string, state: string): Promise<string | null> {
    try {
      const config = await this.getConfigStatus('google');
      
      if (!config.enabled || !config.clientId) {
        return null;
      }

      const redirectUri = this.generateRedirectUri('google');
      const scope = 'openid email profile'; // default scope for Google OAuth
      
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent'
      });

      return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      return null;
    }
  }

  /**
   * Generate code challenge for PKCE
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64String = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return base64String.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Generate code verifier for PKCE
   */
  public generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}

export const ssoService = new SSOService();