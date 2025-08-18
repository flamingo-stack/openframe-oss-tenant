import type { SSOConfigRequest, SSOConfigResponse, SSOProviderInfo } from '@/types/sso';
import { restClient } from '../apollo/apolloClient';

export class SSOService {
  private static readonly BASE_URL = '/sso';
  // Note: login button enablement and auth URLs are handled via Gateway now

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