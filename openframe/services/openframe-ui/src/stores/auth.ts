import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  tenant_domain?: string;
}

export const useAuthStore = defineStore('auth', () => {
  // Cache for server-verified status
  const authStatusCache = ref<boolean | null>(null)
  
  // Reactive function to check authentication status based on cookie presence  
  const isAuthenticated = ref(false)
  
  // Function to update authentication status from cache
  function updateAuthStatus() {
    // HttpOnly cookies are not readable from JS; rely on server-verified cache
    if (authStatusCache.value !== null) {
      isAuthenticated.value = authStatusCache.value
    } else {
      isAuthenticated.value = false
    }
  }
  
  // Initialize auth status on store creation
  updateAuthStatus()

  // Authorization Server URLs
  const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_URL

  /**
   * Form-based login using Authorization Server OAuth2 token endpoint
   * This uses the standard OAuth2 password grant flow
   */
  async function login(email: string, password: string): Promise<TokenResponse> {
    try {
      // Clear any stale refresh flags
      localStorage.removeItem('is_refreshing');

      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', email);
      formData.append('password', password);
      formData.append('client_id', 'openframe-ui');
      formData.append('scope', 'openid profile email openframe.read openframe.write');

      const response = await fetch(`${AUTH_SERVER_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa('openframe-ui:openframe-ui-secret') // Basic auth for client
        },
        credentials: 'include', // Include cookies for HttpOnly token setting
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Login failed');
      }

      // Tokens are now set as HTTP-only cookies by the Authorization Server
      console.log('🔑 [AuthStore] Login successful, tokens set via HTTP-only cookies');
      authStatusCache.value = true;
      updateAuthStatus();
      
      return data;
    } catch (error) {
      // Also clear refresh flag on error
      localStorage.removeItem('is_refreshing');
      authStatusCache.value = false;
      updateAuthStatus();
      throw error;
    }
  }

  /**
   * Token refresh using Authorization Server OAuth2 token endpoint
   */
  async function tryRefreshToken(): Promise<boolean> {
    try {
      console.log('🔄 [AuthStore] Attempting token refresh via HttpOnly cookies...');
      
      // Use standard OAuth2 token endpoint with refresh_token grant
      // Our CookieToHeaderFilter will extract refresh_token from HttpOnly cookie
      const response = await fetch(`${AUTH_SERVER_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'include', // Include HttpOnly cookies
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: import.meta.env.VITE_CLIENT_ID as string
          // refresh_token will be automatically extracted from HttpOnly cookie by CookieToHeaderFilter
        })
      });

      if (response.ok) {
        console.log('✅ [AuthStore] Token refresh successful - new tokens set as HttpOnly cookies');
        authStatusCache.value = true;
        updateAuthStatus();
        return true;
      } else {
        console.log('❌ [AuthStore] Token refresh failed:', response.status);
        authStatusCache.value = false;
        updateAuthStatus();
        return false;
      }
    } catch (error) {
      console.error('❌ [AuthStore] Token refresh error:', error);
      authStatusCache.value = false;
      updateAuthStatus();
      return false;
    }
  }

  /**
   * Logout using Authorization Server
   */
  async function logout() {
    try {
      // Call logout endpoint to clear HttpOnly cookies (both access and refresh tokens)
      const response = await fetch(`${AUTH_SERVER_URL}/oauth/logout`, {
        method: 'POST',
        credentials: 'include' // Include cookies for clearing
      });
      
      if (!response.ok) {
        console.warn('⚠️ [AuthStore] Logout endpoint failed, continuing with local logout');
      }
    } catch (error) {
      console.warn('⚠️ [AuthStore] Logout request failed:', error);
    }
    
    // Clear any localStorage remnants and update cached status
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_refreshing');
    
    authStatusCache.value = false;
    updateAuthStatus();
    
    console.log('🚪 [AuthStore] User logged out, cookies cleared');
  }

  /**
   * Check authentication status with Authorization Server
   */
  async function checkAuthStatus(): Promise<boolean> {
    try {
      // Try to access a protected endpoint to verify authentication via API Gateway
      const response = await fetch(`${import.meta.env.VITE_API_URL}/oauth/me`, {
        method: 'GET',
        credentials: 'include', // Include HttpOnly cookies
      });

      const isValid = response.ok;
      authStatusCache.value = isValid;
      updateAuthStatus();
      
      return isValid;
    } catch (error) {
      console.error('❌ [AuthStore] Auth status check failed:', error);
      authStatusCache.value = false;
      updateAuthStatus();
      return false;
    }
  }

  /**
   * User registration using Authorization Server
   */
  async function register(email: string, password: string, firstName: string, lastName: string, tenantName: string = 'localhost'): Promise<TokenResponse> {
    try {
      // Clear any stale refresh flags
      localStorage.removeItem('is_refreshing');

      const requestBody = {
        email: email,
        first_name: firstName,
        last_name: lastName,
        password: password,
        tenant_name: tenantName // Changed from tenant_id to tenant_name
      };

      const response = await fetch(`${AUTH_SERVER_URL}/oauth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('openframe-ui:openframe-ui-secret') // Basic auth for client
        },
        credentials: 'include', // Include cookies for HttpOnly token setting
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Registration failed');
      }

      // Tokens are now set as HTTP-only cookies by the Authorization Server
      console.log('🎉 [AuthStore] Registration successful, tokens set via HTTP-only cookies');
      authStatusCache.value = true;
      updateAuthStatus();
      
      return data;
    } catch (error) {
      // Also clear refresh flag on error
      localStorage.removeItem('is_refreshing');
      authStatusCache.value = false;
      updateAuthStatus();
      throw error;
    }
  }

  /**
   * User registration with tenant domain for multi-tenant setup
   */
  async function registerWithDomain(email: string, password: string, firstName: string, lastName: string, tenantDomain: string): Promise<TokenResponse> {
    try {
      // Clear any stale refresh flags
      localStorage.removeItem('is_refreshing');

      const requestBody = {
        email: email,
        first_name: firstName,
        last_name: lastName,
        password: password,
        tenant_domain: tenantDomain
      };

      const response = await fetch(`${AUTH_SERVER_URL}/oauth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('openframe-ui:openframe-ui-secret')
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Registration failed');
      }

      console.log('🎉 [AuthStore] Registration with domain successful');
      authStatusCache.value = true;
      updateAuthStatus();
      
      return data;
    } catch (error) {
      localStorage.removeItem('is_refreshing');
      authStatusCache.value = false;
      updateAuthStatus();
      throw error;
    }
  }

  /**
   * Google SSO authentication
   */
  async function authenticateWithGoogle(code: string, state?: string, redirectUri?: string): Promise<TokenResponse> {
    try {
      const request = {
        code,
        state,
        redirectUri: redirectUri || `${window.location.origin}/oauth2/callback/google`
      };

      const response = await fetch(`${AUTH_SERVER_URL}/oauth2/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(request)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Google authentication failed');
      }

      // Tokens are now set as HTTP-only cookies by the Authorization Server
      console.log('🔑 [AuthStore] Google SSO successful, tokens set via HTTP-only cookies');
      authStatusCache.value = true;
      updateAuthStatus();
      
      return data;
    } catch (error) {
      authStatusCache.value = false;
      updateAuthStatus();
      throw error;
    }
  }

  /**
   * Get SSO providers
   */
  async function getSSProviders() {
    try {
      const response = await fetch(`${AUTH_SERVER_URL}/sso/providers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SSO providers');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch SSO providers:', error);
      return [];
    }
  }

  return {
    isAuthenticated,
    login,
    register,
    registerWithDomain,
    logout,
    tryRefreshToken,
    checkAuthStatus,
    updateAuthStatus,
    authenticateWithGoogle,
    getSSProviders
  }
})