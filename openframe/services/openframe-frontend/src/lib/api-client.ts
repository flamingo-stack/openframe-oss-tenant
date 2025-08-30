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

class ApiClient {
  private baseUrl: string
  private isDevTicketEnabled: boolean

  constructor() {
    // Get base URL from environment or default
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
    
    // Check if DevTicket observer is enabled
    this.isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
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
   * Make an authenticated API request
   */
  async request<T = any>(
    path: string,
    options: ApiRequestOptions = {}
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
      console.log(`🔄 [API Client] ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
        credentials: 'include', // Always include cookies for cookie-based auth
      })
      
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