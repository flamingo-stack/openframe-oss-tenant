/**
 * Dedicated Auth API Client
 * Handles auth endpoints: /me, /oauth/*, /oauth/refresh
 * Uses SHARED_HOST_URL when provided; otherwise uses relative URLs.
 */

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/app/auth/hooks/use-token-storage';
import { isSaasSharedMode } from './app-mode';
import { clearStoredTokens, forceLogout } from './force-logout';
import { runtimeEnv } from './runtime-config';

function getDomainSuffix(): string {
  const sharedUrl = runtimeEnv.sharedHostUrl();
  if (!sharedUrl) {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return hostname;
    }
    return 'localhost';
  }

  const withoutProtocol = sharedUrl.replace(/^https?:\/\//, '');
  const domain = withoutProtocol.split('/')[0].split(':')[0];

  return domain || 'localhost';
}

export const SAAS_DOMAIN_SUFFIX = getDomainSuffix();

export interface AuthApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  ok: boolean;
}

function buildAuthUrl(path: string): string {
  const base = runtimeEnv.sharedHostUrl();
  if (!base) return path.startsWith('/') ? path : `/${path}`;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

class AuthApiClient {
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        let tenantId: string | undefined;
        try {
          const { useAuthStore } = await import('../app/auth/stores/auth-store');
          const authState = useAuthStore.getState();
          tenantId = authState.tenantId || (authState.user as any)?.organizationId || (authState.user as any)?.tenantId;
        } catch {}

        const refreshResponse = await this.refresh(tenantId || '');

        if (refreshResponse.status === 401) {
          clearStoredTokens();
          return false;
        }

        if (refreshResponse.ok) {
          if (runtimeEnv.enableDevTicketObserver()) {
            let newAccessToken: string | null = null;
            let newRefreshToken: string | null = null;

            if (refreshResponse.data) {
              newAccessToken = refreshResponse.data?.access_token || refreshResponse.data?.accessToken || null;
              newRefreshToken = refreshResponse.data?.refresh_token || refreshResponse.data?.refreshToken || null;
            }

            if (newAccessToken) {
              localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
              if (newRefreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
              }
              return true;
            } else {
              return true;
            }
          }
          return true;
        } else {
          clearStoredTokens();
          return false;
        }
      } catch (_error) {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async forceLogout(): Promise<void> {
    await forceLogout({
      reason: 'Auth API Client - Token refresh failed',
    });
  }

  async handleUnauthorized<T>(
    url: string,
    headers: Record<string, string>,
    init: RequestInit,
  ): Promise<AuthApiResponse<T> | null> {
    const refreshSuccess = await this.refreshAccessToken();

    if (refreshSuccess) {
      if (runtimeEnv.enableDevTicketObserver()) {
        const newToken = localStorage.getItem('of_access_token');
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
        }
      }

      const retryRes = await fetch(url, {
        credentials: 'include',
        headers,
        ...init,
      });

      let retryData: T | undefined;
      const retryContentType = retryRes.headers.get('content-type') || '';
      if (retryContentType.includes('application/json')) {
        try {
          retryData = await retryRes.json();
        } catch {}
      }

      return {
        data: retryData,
        error: retryRes.ok ? undefined : `Request failed with status ${retryRes.status}`,
        status: retryRes.status,
        ok: retryRes.ok,
      };
    } else {
      await this.forceLogout();
      return null;
    }
  }

  refresh<T = any>(tenantId?: string) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return requestRefresh<T>(`/oauth/refresh${query}`, { method: 'POST' });
  }

  devExchange(ticket: string): Promise<Response> {
    const base = runtimeEnv.sharedHostUrl() || '';
    const url = `${base}/oauth/dev-exchange?ticket=${encodeURIComponent(ticket)}`;
    return fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  }

  oauth<T = any>(path: string, body?: any, init: RequestInit = {}) {
    return request<T>(`/oauth/${path.replace(/^\//, '')}`, {
      method: body ? 'POST' : init.method || 'GET',
      body: body ? JSON.stringify(body) : init.body,
      ...init,
    });
  }

  discoverTenants<T = any>(email: string) {
    const path = `/sas/tenant/discover?email=${encodeURIComponent(email)}`;
    return requestPublic<T>(path, { method: 'GET' });
  }

  checkDomainAvailability<T = any>(subdomain: string, organizationName: string) {
    const fullDomain = `${subdomain}.${SAAS_DOMAIN_SUFFIX}`;
    const path = `/api/tenant/availability?domain=${encodeURIComponent(fullDomain)}&organizationName=${encodeURIComponent(organizationName)}`;
    return requestPublic<T>(path, { method: 'GET' });
  }

  validateAccessCode<T = any>(email: string, code: string) {
    const path = `/sas/oauth/access-code/validate?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
    return requestPublic<T>(path, { method: 'GET' });
  }

  resendVerificationEmail<T = any>(email: string) {
    const path = `/sas/email/verify/resend?email=${encodeURIComponent(email)}`;
    return requestPublic<T>(path, { method: 'POST' });
  }

  registerOrganization<T = any>(payload: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    tenantName: string;
    tenantDomain: string;
    accessCode?: string;
  }) {
    return request<T>(`/sas/oauth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  registerOrganizationSso(payload: {
    tenantName: string;
    tenantDomain: string;
    email: string;
    provider: 'google' | 'microsoft';
    accessCode: string;
    redirectTo?: string;
  }) {
    const params = new URLSearchParams({
      tenantName: payload.tenantName,
      tenantDomain: payload.tenantDomain,
      email: payload.email,
      provider: payload.provider,
      accessCode: payload.accessCode,
    });

    if (payload.redirectTo) {
      params.append('redirectTo', payload.redirectTo);
    }

    const url = buildAuthUrl(`/sas/oauth/register/sso?${params.toString()}`);
    window.location.href = url;

    return Promise.resolve({ ok: true, status: 302, data: null, error: null });
  }

  getRegistrationProviders<T = any>() {
    return request<T>(`/sas/sso/providers/registration`, {
      method: 'GET',
    });
  }

  getInviteProviders<T = any>(invitationId: string) {
    return request<T>(`/sas/sso/providers/invite?invitationId=${encodeURIComponent(invitationId)}`, {
      method: 'GET',
    });
  }

  acceptInvitation<T = any>(payload: {
    invitationId: string;
    password: string;
    firstName: string;
    lastName: string;
    switchTenant?: boolean;
  }) {
    return request<T>(`/sas/invitations/accept`, {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        switchTenant: payload.switchTenant || false,
      }),
    });
  }

  acceptInvitationSso(payload: {
    invitationId: string;
    provider: 'google' | 'microsoft';
    switchTenant?: boolean;
    redirectTo?: string;
  }) {
    const params = new URLSearchParams({
      invitationId: payload.invitationId,
      provider: payload.provider,
    });

    if (payload.switchTenant !== undefined) {
      params.append('switchTenant', payload.switchTenant.toString());
    }

    if (payload.redirectTo) {
      params.append('redirectTo', payload.redirectTo);
    }

    const url = buildAuthUrl(`/sas/invitations/accept/sso?${params.toString()}`);
    window.location.href = url;

    return Promise.resolve({ ok: true, status: 302, data: null, error: null });
  }

  confirmPasswordReset<T = any>(payload: { token: string; newPassword: string }) {
    return request<T>(`/sas/password-reset/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  requestPasswordReset<T = any>(payload: { email: string }) {
    return request<T>(`/sas/password-reset/request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  loginUrl(tenantId: string, redirectTo: string, provider?: string) {
    const providerParam = provider && provider !== 'openframe-sso' ? `&provider=${encodeURIComponent(provider)}` : '';
    const base = `/oauth/login?tenantId=${encodeURIComponent(tenantId)}${providerParam}`;
    console.log(isSaasSharedMode());
    const path = isSaasSharedMode() ? base : `${base}&redirectTo=${redirectTo}`;
    return buildAuthUrl(path);
  }

  logout(tenantId?: string) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const logoutUrl = buildAuthUrl(`/oauth/logout${query}`);

    try {
      window.location.href = logoutUrl;
    } catch (_error) {
      window.location.assign(logoutUrl);
    }
  }
}

const authApiClient = new AuthApiClient();

async function requestRefresh<T = any>(path: string, init: RequestInit = {}): Promise<AuthApiResponse<T>> {
  const url = buildAuthUrl(path);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers || ({} as any)),
  };

  if (runtimeEnv.enableDevTicketObserver()) {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        headers['Refresh-Token'] = refreshToken;
      }
    } catch (_error) {}
  }

  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers,
      ...init,
    });

    let data: T | undefined;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {}
    }

    if (runtimeEnv.enableDevTicketObserver() && res.ok) {
      const accessToken = res.headers.get('Access-Token') || res.headers.get('access-token');
      const refreshToken = res.headers.get('Refresh-Token') || res.headers.get('refresh-token');

      if (accessToken || refreshToken) {
        data = {
          ...data,
          access_token: accessToken,
          refresh_token: refreshToken,
        } as T;
      }
    }

    return {
      data,
      error: res.ok ? undefined : `Request failed with status ${res.status}`,
      status: res.status,
      ok: res.ok,
    };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'Network error' };
  }
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<AuthApiResponse<T>> {
  const url = buildAuthUrl(path);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers || ({} as any)),
  };
  if (runtimeEnv.enableDevTicketObserver()) {
    try {
      const token = localStorage.getItem('of_access_token');
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers,
      ...init,
    });

    if (res.status === 401) {
      const retryResult = await authApiClient.handleUnauthorized<T>(url, headers, init);
      if (retryResult) {
        return retryResult;
      } else {
        return {
          data: undefined,
          error: 'Authentication failed - please login again',
          status: 401,
          ok: false,
        };
      }
    }

    let data: T | undefined;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {}
    }

    return {
      data,
      error: res.ok ? undefined : `Request failed with status ${res.status}`,
      status: res.status,
      ok: res.ok,
    };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'Network error' };
  }
}

async function requestPublic<T = any>(path: string, init: RequestInit = {}): Promise<AuthApiResponse<T>> {
  const url = buildAuthUrl(path);
  try {
    const res = await fetch(url, {
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        ...(init.headers || ({} as any)),
      },
      ...init,
    });

    let data: T | undefined;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {}
    }

    return {
      data,
      error: res.ok ? undefined : `Request failed with status ${res.status}`,
      status: res.status,
      ok: res.ok,
    };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export { authApiClient };

export type AuthApiResponseAlias<T = any> = AuthApiResponse<T>;
