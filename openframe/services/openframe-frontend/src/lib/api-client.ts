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
  private requestQueue: Array<() => Promise<any>> = []

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
        }
      } catch (error) {
        console.error('[API Client] Failed to get access token:', error)
      }
    }
    
    return headers
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    // Absolute URLs pass through
    if (path.startsWith('http://') || path.startsWith('https://')) return path

    const tenantHost = runtimeEnv.tenantHostUrl()
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    if (tenantHost) return `${tenantHost}${cleanPath}`

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
          console.warn('[API Client] No tenant ID found for refresh; attempting refresh without tenantId')
        }

        const responseRaw = await authApiClient.refresh(tenantId)
        // Adapter to existing logic
        const response = {
          ok: responseRaw.ok,
          status: responseRaw.status,
          headers: new Headers(),
          json: async () => responseRaw.data as any,
        } as unknown as Response

        if (response.ok) {
          if (this.isDevTicketEnabled) {
            let newAccessToken: string | null = null
            let newRefreshToken: string | null = null

            const data = responseRaw.data
            if (data) {
              newAccessToken = data.access_token || data.accessToken || null
              newRefreshToken = data.refresh_token || data.refreshToken || null
            }

            if (newAccessToken) {
              localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
              if (newRefreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
              }
              return true
            } else {
              return false
            }
          }

          return true
        } else {
          return false
        }
      } catch (error) {
        return false
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
        
        const queue = [...this.requestQueue]
        if (queue.length > 0) {
          this.requestQueue = []
          queue.forEach(retryRequest => retryRequest())
        }
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
          // Just return the 401 without forcing logout
          return {
            data: undefined,
            error: 'Unauthorized',
            status: 401,
            ok: false,
          }
        }

        if (this.isRefreshing) {
          return new Promise<ApiResponse<T>>((resolve) => {
            this.requestQueue.push(async () => {
              const result = await this.request<T>(path, options, true)
              resolve(result)
            })
          })
        }

        const refreshSuccess = await this.refreshAccessToken()

        const queue = [...this.requestQueue]
        this.requestQueue = []
        
        if (refreshSuccess) {
          queue.forEach(retryRequest => retryRequest())
          return this.request<T>(path, options, true)
        } else {
          queue.forEach(retryRequest => {
            retryRequest().catch(() => {})
          })

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
          console.error('[API Client] Failed to parse JSON response:', error)
        }
      }

      // Extract error message from response body if available
      let errorMessage: string | undefined
      if (!response.ok) {
        const errorData = data as any
        errorMessage = errorData?.message || errorData?.error || `Request failed with status ${response.status}`
      }

      return {
        data,
        error: errorMessage,
        status: response.status,
        ok: response.ok,
      }
    } catch (error) {
      // Aborted requests should never trigger auth refresh or logout
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          error: 'Request aborted',
          status: 0,
          ok: false,
        }
      }

      // Check if this might be a 401 error masquerading as a network error
      // This can happen in localhost deployments where fetch fails completely on 401
      if (!skipAuth && !isRetry) {
        // Check if on auth page - skip refresh/logout to prevent loops
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
        const isAuthPage = currentPath.startsWith('/auth')
        
        if (!isAuthPage) {
          if (this.isRefreshing) {
            return new Promise<ApiResponse<T>>((resolve) => {
              this.requestQueue.push(async () => {
                const result = await this.request<T>(path, options, true)
                resolve(result)
              })
            })
          }

          const refreshSuccess = await this.refreshAccessToken()

          const queue = [...this.requestQueue]
          this.requestQueue = []
          
          if (refreshSuccess) {
            queue.forEach(retryRequest => retryRequest())
            return this.request<T>(path, options, true)
          } else {
            queue.forEach(retryRequest => {
              retryRequest().catch(() => {})
            })

            await this.forceLogout()
            
            return {
              error: 'Authentication failed - please login again',
              status: 401,
              ok: false,
            }
          }
        }
      }
      
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

  me<T = any>() {
    return this.request<T>('/api/me')
  }
}

// Create singleton instance
const apiClient = new ApiClient()

// Export instance and class
export { apiClient, ApiClient }
export type { ApiResponse, ApiRequestOptions }