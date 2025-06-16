import type { SSOConfigRequest, SSOConfigResponse, SSOConfigStatus } from '@/types/sso';
import { restClient } from '../apollo/apolloClient';

export class SSOService {
  private static readonly BASE_URL = '/sso';

  /**
   * Get SSO configuration status for OAuth login buttons
   * Returns minimal info about whether SSO is configured and enabled
   */
  public async getConfigStatus(provider: string): Promise<SSOConfigStatus> {
    return await restClient.get<SSOConfigStatus>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}/status`);
  }

  /**
   * Get full SSO configuration for admin forms
   * Returns all configuration data except sensitive fields
   */
  public async getConfig(provider: string): Promise<SSOConfigResponse> {
    return await restClient.get<SSOConfigResponse>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}`);
  }

  /**
   * Create or update SSO configuration
   */
  public async saveConfig(provider: string, config: SSOConfigRequest): Promise<SSOConfigResponse> {
    // Determine if this is create or update based on whether config exists
    const currentConfig = await this.getConfig(provider);
    const isUpdate = currentConfig.id !== null;

    if (isUpdate) {
      return await restClient.put<SSOConfigResponse>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}`, config);
    } else {
      return await restClient.post<SSOConfigResponse>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}`, config);
    }
  }

  /**
   * Toggle SSO configuration enabled/disabled status
   */
  public async toggleConfig(provider: string, enabled: boolean): Promise<SSOConfigResponse> {
    return await restClient.patch<SSOConfigResponse>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}/toggle?enabled=${enabled}`, {});
  }

  /**
   * Delete SSO configuration
   */
  public async deleteConfig(provider: string): Promise<void> {
    await restClient.delete<void>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}`, {});
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
      
      if (!config.configured || !config.enabled || !config.clientId) {
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