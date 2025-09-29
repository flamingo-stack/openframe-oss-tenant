/**
 * Dedicated Auth API Client
 * Handles auth endpoints: /me, /oauth/*, /oauth/refresh
 * Uses SHARED_HOST_URL when provided; otherwise uses relative URLs.
 */

import { runtimeEnv } from './runtime-config'
import { isSaasSharedMode } from './app-mode'

export interface AuthApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  ok: boolean
}

function buildAuthUrl(path: string): string {
  const base = runtimeEnv.sharedHostUrl()
  if (!base) return path.startsWith('/') ? path : `/${path}`
  // ensure single slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<AuthApiResponse<T>> {
  const url = buildAuthUrl(path)
  // Optional header-token mode for local dev (DevTicket)
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers || {} as any),
  }
  if (runtimeEnv.enableDevTicketObserver()) {
    try {
      const token = localStorage.getItem('of_access_token')
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch {}
  }
  try {
    const res = await fetch(url, {
      credentials: 'include', // include cookies for cookie-based auth
      headers,
      ...init,
    })

    let data: T | undefined
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try { data = await res.json() } catch {}
    }

    return {
      data,
      error: res.ok ? undefined : `Request failed with status ${res.status}`,
      status: res.status,
      ok: res.ok,
    }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'Network error' }
  }
}

// Public (no-auth) request helper. Never sends cookies or Authorization header.
async function requestPublic<T = any>(path: string, init: RequestInit = {}): Promise<AuthApiResponse<T>> {
  const url = buildAuthUrl(path)
  try {
    console.log('🔄 [Auth API Client] Requesting public URL:', url)
    const res = await fetch(url, {
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        ...(init.headers || {} as any),
      },
      ...init,
    })

    let data: T | undefined
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try { data = await res.json() } catch {}
    }

    return {
      data,
      error: res.ok ? undefined : `Request failed with status ${res.status}`,
      status: res.status,
      ok: res.ok,
    }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export const authApiClient = {
  me<T = any>() {
    return request<T>('/api/me')
  },
  devExchange(ticket: string): Promise<Response> {
    const base = runtimeEnv.sharedHostUrl() || ''
    const url = `${base}/oauth/dev-exchange?ticket=${encodeURIComponent(ticket)}`
    return fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    })
  },
  oauth<T = any>(path: string, body?: any, init: RequestInit = {}) {
    return request<T>(`/oauth/${path.replace(/^\//, '')}`, {
      method: body ? 'POST' : (init.method || 'GET'),
      body: body ? JSON.stringify(body) : init.body,
      ...init,
    })
  },
  refresh<T = any>(tenantId?: string) {
    const base = runtimeEnv.sharedHostUrl() || ''
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''

    return request<T>(`/oauth/refresh${query}`, { method: 'GET' })
  },
  discoverTenants<T = any>(email: string) {
    // MUST NOT include auth cookies or Authorization header
    const path = `/sas/tenant/discover?email=${encodeURIComponent(email)}`
    return requestPublic<T>(path, { method: 'GET' })
  },
  registerOrganization<T = any>(payload: {
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    tenantName: string,
    tenantDomain: string,
  }) {
    return request<T>(`/sas/oauth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  loginUrl(tenantId: string, redirectTo: string, provider?: string) {
    const providerParam = provider && provider !== 'openframe-sso' ? `&provider=${encodeURIComponent(provider)}` : ''
    const base = `/oauth/login?tenantId=${encodeURIComponent(tenantId)}${providerParam}`
    const path = isSaasSharedMode()
      ? base
      : `${base}&redirectTo=${redirectTo}`
    return buildAuthUrl(path)
  },
  logout<T = any>(tenantId?: string) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''
    return request<T>(`/oauth/logout${query}`, { method: 'GET', keepalive: true as any })
  },
}

export type AuthApiResponseAlias<T = any> = AuthApiResponse<T>


