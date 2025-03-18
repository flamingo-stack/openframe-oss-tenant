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
      formData.append('client_id', config.clientId);
      formData.append('client_secret', config.clientSecret);
      formData.append('scope', 'openid profile email');

      const response = await fetch(`${config.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Login failed');
      }

      await setTokens(data.access_token, data.refresh_token);
      return data;
    } catch (error) {
      // Also clear refresh flag on error
      localStorage.removeItem('is_refreshing');
      throw error;
    }
  }

  async function refreshToken(refreshToken: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', config.clientId);
    formData.append('client_secret', config.clientSecret);

    const response = await fetch(`${config.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || 'Token refresh failed');
    }

    await setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async function setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    isAuthenticated.value = true;
  }

  async function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    isAuthenticated.value = false;
  }

  async function handleAuthError(error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('token expired')) {
        const storedRefreshToken = localStorage.getItem('refresh_token');
        if (storedRefreshToken) {
          try {
            await refreshToken(storedRefreshToken);
            return true;
          } catch (refreshError) {
            await logout();
            return false;
          }
        }
      }
    }
    return false;
  }

  async function register(email: string, password: string, firstName: string, lastName: string): Promise<TokenResponse> {
    try {
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

      await setTokens(data.access_token, data.refresh_token);
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
    refreshToken,
    setTokens,
    logout,
    handleAuthError
  }
})