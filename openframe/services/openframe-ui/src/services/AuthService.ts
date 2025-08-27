import { restClient } from '../apollo/apolloClient';
import type { TenantDiscoveryResponse, TokenResponse } from '../types/auth';

export class AuthService {
  private static readonly GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'https://localhost';

  /**
   * Initiate OAuth2 login flow through Gateway
   * Redirects to Gateway's /auth/login endpoint
   */
  public async login(tenantId: string): Promise<void> {
    this.setCurrentTenantId(tenantId);
    const loginUrl = `${AuthService.GATEWAY_URL}/oauth/login?tenantId=${encodeURIComponent(tenantId)}`;
    console.log('🔑 [AuthService] Redirecting to Gateway:', loginUrl);
    window.location.href = loginUrl;
  }

  /**
   * Refresh access token using refresh token from cookie
   * Gateway handles the refresh and updates cookies
   */
  public async refreshToken(tenantId: string): Promise<TokenResponse> {
    const response = await restClient.post<TokenResponse>(
      `${AuthService.GATEWAY_URL}/oauth/refresh?tenantId=${encodeURIComponent(tenantId)}`
    );
    return response;
  }

  /**
   * Logout user by calling Gateway's logout endpoint
   * Gateway will clear cookies and redirect to appropriate page
   */
  public async logout(tenantId: string): Promise<void> {
    const url = `/oauth/logout?tenantId=${encodeURIComponent(tenantId)}`;
    console.log('🚪 [AuthService] Calling Gateway logout (XHR):', url);
    try {
      // Use XHR so we can control client-side navigation after 204
      await (await import('../apollo/apolloClient')).restClient.get(url, {
        headers: { 'x-no-refresh': '1' }
      });
    } catch (e) {
      console.warn('⚠️ [AuthService] Logout request failed (continuing with client redirect):', e);
    } finally {
      // Ensure SPA leaves the current page after tokens/cookies cleared
      window.location.replace('/central-auth-demo');
    }
  }

  /**
   * Discover tenants for a given email address
   * This method calls the tenant discovery service on Authorization Server
   */
  public async discoverTenants(email: string): Promise<TenantDiscoveryResponse> {
    const response = await restClient.get<TenantDiscoveryResponse>(
      `${AuthService.GATEWAY_URL}/sas/tenant/discover?email=${encodeURIComponent(email)}`
    );
    return response;
  }

  /**
   * Initiate OpenFrame SSO for a specific tenant
   * Redirects to Gateway's login endpoint
   */
  public async openFrameSSO(tenantName: string): Promise<void> {
    // Persist current tenant for subsequent refresh calls
    this.setCurrentTenantId(tenantName);
    const loginUrl = `${AuthService.GATEWAY_URL}/oauth/login?tenantId=${encodeURIComponent(tenantName)}`;
    window.location.href = loginUrl;
  }

  // Tenant availability (Authorization Server)
  public static async checkTenantAvailability(name: string): Promise<{ is_available: boolean; message?: string; suggested_url?: string }>{
    const url = `${AuthService.GATEWAY_URL}/sas/tenant/availability?name=${encodeURIComponent(name)}`;
    return restClient.get(url);
  }

  // Organization/user registration (Authorization Server)
  public static async registerOrganization(payload: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    tenantName: string;
    tenantDomain?: string;
  }): Promise<any> {
    const url = `${AuthService.GATEWAY_URL}/sas/oauth/register`;
    const body: Record<string, unknown> = {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      password: payload.password,
      tenantName: payload.tenantName
    };
    if (payload.tenantDomain) {
      body.tenantDomain = payload.tenantDomain;
    }
    return restClient.post(url, body);
  }

  /**
   * Check if user is authenticated by checking for access token cookie
   * Note: This is a simple check - the actual validation happens on the backend
   */
  public isAuthenticated(): boolean {
    return document.cookie
      .split(';')
      .some(cookie => cookie.trim().startsWith('access_token='));
  }

  /**
   * Get current tenant ID from session storage
   */
  public getCurrentTenantId(): string | null {
    return sessionStorage.getItem('currentTenantId');
  }

  /**
   * Set current tenant ID in session storage
   */
  public setCurrentTenantId(tenantId: string): void {
    sessionStorage.setItem('currentTenantId', tenantId);
  }
}

export const authService = new AuthService();