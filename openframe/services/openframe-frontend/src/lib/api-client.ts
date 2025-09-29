/**
 * Centralized API Client Configuration
 * Handles both cookie-based and header-based authentication automatically
 */

// Constants for localStorage keys (matching use-token-storage.ts)
const ACCESS_TOKEN_KEY = 'of_access_token'
const REFRESH_TOKEN_KEY = 'of_refresh_token'

interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  skipAuth?: boolean
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  ok: boolean
}

import { runtimeEnv } from './runtime-config'
import { authApiClient } from './auth-api-client'
import { forceLogout } from './force-logout'

class ApiClient {
  private isDevTicketEnabled: boolean
  private isRefreshing: boolean = false
  private refreshPromise: Promise<boolean> | null = null

  constructor() {
    this.isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
  }

  /**
   * Get authentication headers based on current configuration
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    
    // If DevTicket is enabled, add token from localStorage to headers
    if (this.isDevTicketEnabled) {
      try {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
          console.log('🔐 [API Client] Added token to headers (DevTicket enabled)')
        }
      } catch (error) {
        console.error('❌ [API Client] Failed to get access token:', error)
      }
    }
    
    return headers
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    console.log('🔄 [API Client] Building URL for path:', path)
    // Absolute URLs pass through
    if (path.startsWith('http://') || path.startsWith('https://')) return path

    const tenantHost = runtimeEnv.tenantHostUrl()
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    if (tenantHost) return `${tenantHost}${cleanPath}`

    console.log('with tenantHost:', tenantHost)
    console.log('🔄 [API Client] Clean path:', cleanPath)

    // Default: use relative path (no host)
    return cleanPath
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    
    // Create the refresh promise
    this.refreshPromise = (async () => {
      try {
        // Get tenant ID from auth store with robust fallbacks
        const { useAuthStore } = await import('../app/auth/stores/auth-store')
        const authState = useAuthStore.getState()
        const storeTenantId = authState.tenantId
        const userTenantId = (authState.user as any)?.organizationId || (authState.user as any)?.tenantId
        const tenantId = storeTenantId || userTenantId

        if (!tenantId) {
          console.warn('⚠️ [API Client] No tenant ID found for refresh; attempting refresh without tenantId')
        }

        console.log('🔄 [API Client] Attempting token refresh via authApiClient...')

        const responseRaw = await authApiClient.refresh(tenantId)
        // Adapter to existing logic
        const response = {
          ok: responseRaw.ok,
          status: responseRaw.status,
          headers: new Headers(),
          json: async () => responseRaw.data as any,
        } as unknown as Response

        if (response.ok) {
          // If running in header-token mode, try to capture new tokens from headers or JSON
          if (this.isDevTicketEnabled) {
            let newAccessToken: string | null = null
            let newRefreshToken: string | null = null

            // Prefer tokens from response headers if present
            try {
              newAccessToken = response.headers.get('Access-Token') || response.headers.get('access-token')
              newRefreshToken = response.headers.get('Refresh-Token') || response.headers.get('refresh-token')
            } catch {}

            // Fall back to JSON body if headers were not provided
            if (!newAccessToken || !newRefreshToken) {
              try {
                const contentType = response.headers.get('content-type') || ''
                if (contentType.includes('application/json')) {
                  const data = await response.json()
                  newAccessToken = newAccessToken || data?.access_token || data?.accessToken || null
                  newRefreshToken = newRefreshToken || data?.refresh_token || data?.refreshToken || null
                }
              } catch (e) {
                console.warn('⚠️ [API Client] Unable to parse refresh response JSON:', e)
              }
            }

            if (newAccessToken) {
              localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
              if (newRefreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
              }
              console.log('✅ [API Client] Token refreshed and stored successfully')
            } else {
              // In header-token mode, absence of new tokens likely means refresh is not usable
              console.error('❌ [API Client] Refresh succeeded but no tokens provided in header-token mode')
              return false
            }
          }

          // In cookie mode, cookies are updated server-side; nothing to store
          return true
        } else {
          console.error('❌ [API Client] Token refresh failed with status:', response.status)
          return false
        }
      } catch (error) {
        console.error('❌ [API Client] Token refresh error:', error)
        return false
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Force logout the user using unified logout utility
   */
  private async forceLogout(): Promise<void> {
    await forceLogout({
      reason: 'API Client - Authentication failure'
    })
  }

  /**
   * Make an authenticated API request
   */
  async request<T = any>(
    path: string,
    options: ApiRequestOptions = {},
    isRetry: boolean = false
  ): Promise<ApiResponse<T>> {
    const { skipAuth = false, headers = {}, ...fetchOptions } = options
    
    // Build headers
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers, // Custom headers from caller
    }
    
    // Add auth headers unless explicitly skipped
    if (!skipAuth) {
      Object.assign(requestHeaders, this.getAuthHeaders())
    }
    
    // Build full URL
    const url = this.buildUrl(path)
    
    try {
      console.log(`🔄 [API Client] ${options.method || 'GET'} ${url}${isRetry ? ' (retry)' : ''}`)
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
        credentials: 'include', // Always include cookies for cookie-based auth
      })
      
      // Handle 401 Unauthorized - attempt token refresh ONLY ONCE
      if (response.status === 401 && !skipAuth && !isRetry) {
        // Check if on auth page - skip refresh/logout to prevent loops
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
        const isAuthPage = currentPath.startsWith('/auth')
        
        if (isAuthPage) {
          console.log('⚠️ [API Client] 401 on auth page - skipping refresh/logout')
          // Just return the 401 without forcing logout
          return {
            data: undefined,
            error: 'Unauthorized',
            status: 401,
            ok: false,
          }
        }
        
        console.log('⚠️ [API Client] 401 Unauthorized - attempting token refresh...')
        
        // Try to refresh the token
        const refreshSuccess = await this.refreshAccessToken()
        
        if (refreshSuccess) {
          console.log('🔄 [API Client] Retrying request after token refresh...')
          // Retry the original request with new token
          return this.request<T>(path, options, true)
        } else {
          console.error('❌ [API Client] Token refresh failed - forcing logout')
          // Force logout on refresh failure
          await this.forceLogout()
          
          return {
            error: 'Authentication failed - please login again',
            status: 401,
            ok: false,
          }
        }
      }
      
      // Parse response
      let data: T | undefined
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        try {
          data = await response.json()
        } catch (error) {
          console.error('❌ [API Client] Failed to parse JSON response:', error)
        }
      }
      
      // Log response status
      if (response.ok) {
        console.log(`✅ [API Client] ${response.status} ${url}`)
      } else {
        console.error(`❌ [API Client] ${response.status} ${url}`)
      }
      
      return {
        data,
        error: response.ok ? undefined : `Request failed with status ${response.status}`,
        status: response.status,
        ok: response.ok,
      }
    } catch (error) {
      console.error(`❌ [API Client] Network error for ${url}:`, error)
      
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
        ok: false,
      }
    }
  }

  /**
   * Convenience methods for common HTTP methods
   */
  async get<T = any>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  async post<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T = any>(path: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T = any>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  /**
   * Special method for requests to external APIs (non-base URL)
   */
  async external<T = any>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, options)
  }
}

// Create singleton instance
const apiClient = new ApiClient()

// Export instance and class
export { apiClient, ApiClient }
export type { ApiResponse, ApiRequestOptions }