import type { SSOConfigRequest, SSOConfigResponse, SSOConfigStatus, SSOProviderInfo } from '@/types/sso';
import { restClient } from '../apollo/apolloClient';

export class SSOService {
  private static readonly BASE_URL = '/sso';
  private static readonly AUTH_SERVER_URL = import.meta.env.VITE_AUTH_URL;

  /**
   * Get enabled SSO providers for login buttons
   * This comes from Authorization Server to show/hide login buttons
   */
  public async getEnabledProviders(): Promise<SSOConfigStatus[]> {
    return await restClient.get<SSOConfigStatus[]>(`${SSOService.AUTH_SERVER_URL}${SSOService.BASE_URL}/providers`);
  }

  /**
   * Get Google OAuth authorization URL (uses standard Spring Security OAuth2)
   */
  public getGoogleAuthUrl(): string {
    return `${SSOService.AUTH_SERVER_URL}/oauth2/authorization/google`;
  }

  // ====== MANAGEMENT OPERATIONS (remain in openframe-api for admins) ======

  /**
   * Get available SSO providers for admin dropdowns
   */
  public async getAvailableProviders(): Promise<SSOProviderInfo[]> {
    return await restClient.get<SSOProviderInfo[]>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/providers/available`);
  }

  /**
   * Get full SSO configuration for admin forms
   */
  public async getConfig(provider: string): Promise<SSOConfigResponse> {
    return await restClient.get<SSOConfigResponse>(`${import.meta.env.VITE_API_URL}${SSOService.BASE_URL}/${provider}`);
  }

  /**
   * Create or update SSO configuration
   */
  public async saveConfig(provider: string, config: SSOConfigRequest): Promise<SSOConfigResponse> {
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
}

export const ssoService = new SSOService(); 