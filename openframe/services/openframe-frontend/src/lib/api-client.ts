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

class ApiClient {
  private baseUrl: string
  private isDevTicketEnabled: boolean
  private isRefreshing: boolean = false
  private refreshPromise: Promise<boolean> | null = null

  constructor() {
    // Get base URL and flags from runtime-config (falls back to env and defaults)
    this.baseUrl = runtimeEnv.apiUrl()
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
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    
    // Build full URL
    return `${this.baseUrl}/${cleanPath}`
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
        // Get tenant ID from auth store
        const { useAuthStore } = await import('../app/auth/stores/auth-store')
        const tenantId = useAuthStore.getState().tenantId
        
        if (!tenantId) {
          console.error('❌ [API Client] No tenant ID found for token refresh')
          return false
        }

        const baseUrl = this.baseUrl.replace('/api', '')
        const refreshUrl = `${baseUrl}/oauth/refresh?tenantId=${encodeURIComponent(tenantId)}`
        
        console.log('🔄 [API Client] Attempting token refresh...')
        
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include', // Include cookies for refresh
        })

        if (response.ok) {
          const data = await response.json()
          
          // Store new tokens if DevTicket is enabled
          if (this.isDevTicketEnabled && data.access_token) {
            localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token)
            if (data.refresh_token) {
              localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
            }
            console.log('✅ [API Client] Token refreshed successfully')
          }
          
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
   * Force logout the user
   */
  private forceLogout(): void {
    // Check if already on auth page to prevent redirect loops
    const currentPath = window.location.pathname
    const isAuthPage = currentPath.startsWith('/auth')
    
    if (isAuthPage) {
      console.log('🔐 [API Client] Already on auth page, skipping force logout redirect')
      // Still clear tokens but don't redirect
      if (this.isDevTicketEnabled) {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
      }
      
      // Clear auth store
      if (typeof window !== 'undefined') {
        import('../app/auth/stores/auth-store').then(({ useAuthStore }) => {
          const { logout } = useAuthStore.getState()
          logout()
        })
      }
      return
    }
    
    console.log('🔐 [API Client] Forcing logout due to authentication failure')
    
    // Clear tokens
    if (this.isDevTicketEnabled) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
    
    // Clear auth store
    if (typeof window !== 'undefined') {
      // Import auth store dynamically to avoid circular dependencies
      import('../app/auth/stores/auth-store').then(({ useAuthStore }) => {
        const { logout } = useAuthStore.getState()
        logout()
        
        // Redirect to auth page
        window.location.href = '/auth'
      })
    }
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
          this.forceLogout()
          
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