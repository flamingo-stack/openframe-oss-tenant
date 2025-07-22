import { defineStore } from 'pinia'
import { ref } from 'vue'
import { OAuthError } from '@/errors/OAuthError'
import { ConfigService } from '@/config/config.service'

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const config = ConfigService.getInstance()

  async function login(email: string, password: string): Promise<TokenResponse> {
    try {
      // Clear any stale refresh flags
      localStorage.removeItem('is_refreshing');

      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', email);
      formData.append('password', password);
      formData.append('client_id', config.getConfig().clientId);
      formData.append('client_secret', config.getConfig().clientSecret);
      formData.append('scope', 'openid profile email');

      const response = await fetch(`${config.getConfig().apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'include', // Include cookies for authentication
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Login failed');
      }

      // Tokens are now set as HTTP-only cookies by the server
      // No longer need to extract tokens from response
      console.log('🔑 [AuthStore] Login successful, tokens set via HTTP-only cookies');
      isAuthenticated.value = true;
      
      return data;
    } catch (error) {
      // Also clear refresh flag on error
      localStorage.removeItem('is_refreshing');
      throw error;
    }
  }

  async function tryRefreshToken(): Promise<boolean> {
    try {
      console.log('🔄 [AuthStore] Attempting token refresh via HttpOnly cookies...');
      
      // SECURITY: Both tokens are now HttpOnly cookies with strict paths
      // Access token cookie: Path=/ (included automatically)  
      // Refresh token cookie: Path=/api/oauth/token (included automatically ONLY on this endpoint)
      const response = await fetch(`${config.getConfig().apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'include', // Include HttpOnly cookies
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.getConfig().clientId,
          client_secret: config.getConfig().clientSecret
          // No refresh_token parameter - it's automatically sent via HttpOnly cookie
        })
      });

      if (response.ok) {
        console.log('✅ [AuthStore] Token refresh successful - new tokens set as HttpOnly cookies');
        return true;
      } else {
        console.log('❌ [AuthStore] Token refresh failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ [AuthStore] Token refresh error:', error);
      return false;
    }
  }

  function setAuthenticated(authenticated: boolean) {
    // Helper function to set authentication status
    // Tokens are managed via HTTP-only cookies by the server
    isAuthenticated.value = authenticated;
    console.log(`🔑 [AuthStore] Authentication status set to: ${authenticated}`);
  }

  async function logout() {
    try {
      // Call logout endpoint to clear HttpOnly cookies (both access and refresh tokens)
      const response = await fetch(`${config.getConfig().apiUrl}/oauth/logout`, {
        method: 'POST',
        credentials: 'include' // Include cookies for clearing
      });
      
      if (!response.ok) {
        console.warn('⚠️ [AuthStore] Logout endpoint failed, continuing with local logout');
      }
    } catch (error) {
      console.warn('⚠️ [AuthStore] Logout request failed:', error);
    }
    
    // Clear any localStorage remnants and update state  
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    isAuthenticated.value = false;
    console.log('🔑 [AuthStore] Logged out and cleared HttpOnly cookies');
  }

  async function checkAuthStatus() {
    // Since tokens are in HTTP-only cookies, we can't access them directly
    // Check authentication by making a request to a protected endpoint
    const apiUrl = config.getConfig().apiUrl;
    const fullUrl = `${apiUrl}/oauth/me`;
    
    console.log('🔑 [AuthStore] Checking auth status...');
    console.log('🔑 [AuthStore] API URL:', apiUrl);
    console.log('🔑 [AuthStore] Full URL:', fullUrl);
    console.log('🔑 [AuthStore] Current domain:', window.location.hostname);
    
    try {
      console.log('🔑 [AuthStore] Making fetch request...');
      const response = await fetch(fullUrl, {
        method: 'GET',
        credentials: 'include' // Include cookies
      });
      
      console.log('🔑 [AuthStore] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const authenticated = response.ok;
      isAuthenticated.value = authenticated;
      console.log('🔑 [AuthStore] Auth status checked via server:', authenticated);
      return authenticated;
    } catch (error) {
      console.error('🔑 [AuthStore] Auth check failed with error:', error);
      console.error('🔑 [AuthStore] Error type:', typeof error);
      if (error instanceof Error) {
        console.error('🔑 [AuthStore] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      isAuthenticated.value = false;
      return false;
    }
  }

  async function handleAuthError(error: unknown): Promise<boolean> {
    // This should be called by apollo client / rest client when they receive 401
    console.log('🔑 [AuthStore] Handling auth error:', error);
    
    // Try to refresh token ONLY if it's an authentication error (401)
    if (error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('token expired') || 
        error.message.includes('Unauthorized')
    )) {
      console.log('🔑 [AuthStore] Attempting token refresh due to 401/expired token');
      try {
        const success = await tryRefreshToken();
        if (success) {
          console.log('🔑 [AuthStore] Token refresh successful');
          return true;
        } else {
          console.log('🔑 [AuthStore] Token refresh failed, logging out');
          await logout();
          return false;
        }
      } catch (refreshError) {
        console.error('🔑 [AuthStore] Token refresh error:', refreshError);
        await logout();
        return false;
      }
    }
    
    // For non-auth errors, just log them
    console.log('🔑 [AuthStore] Non-auth error, not attempting refresh');
    return false;
  }

  async function register(email: string, password: string, firstName: string, lastName: string): Promise<TokenResponse> {
    try {
      const config = ConfigService.getInstance().getConfig();
      const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
      const apiUrl = `${config.apiUrl}/oauth/register`;
      console.log('Attempting to register with URL:', apiUrl);
      console.log('Environment variables:', {
        apiUrl: config.apiUrl, 
        clientId: config.clientId,
        clientSecret: config.clientSecret
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error_description) {
          throw new OAuthError(data.error || 'invalid_request', data.error_description);
        } else if (data.message) {
          throw new OAuthError('invalid_request', data.message);
        } else if (data.error) {
          throw new OAuthError(data.error, 'Registration failed');
        } else {
          throw new OAuthError('server_error', 'Registration failed. Please try again.');
        }
      }

      // Tokens are now set as HTTP-only cookies by the server
      console.log('🔑 [AuthStore] Registration successful, tokens set via HTTP-only cookies');
      isAuthenticated.value = true;
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  return {
    isAuthenticated,
    login,
    register,
    tryRefreshToken,
    setAuthenticated,
    logout,
    checkAuthStatus,
    handleAuthError
  }
})