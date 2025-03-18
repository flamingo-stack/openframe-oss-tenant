import { defineStore } from 'pinia'
import { ref } from 'vue'
import { OAuthError } from '@/errors/OAuthError'

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)

  async function login(email: string, password: string): Promise<TokenResponse> {
    try {
      // Clear any stale refresh flags
      localStorage.removeItem('is_refreshing');

      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', email);
      formData.append('password', password);
      formData.append('client_id', import.meta.env.VITE_CLIENT_ID);
      formData.append('client_secret', import.meta.env.VITE_CLIENT_SECRET);
      formData.append('scope', 'openid profile email');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/oauth/token`, {
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
    formData.append('client_id', import.meta.env.VITE_CLIENT_ID);
    formData.append('client_secret', import.meta.env.VITE_CLIENT_SECRET);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/oauth/token`, {
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
      const credentials = btoa(`${import.meta.env.VITE_CLIENT_ID}:${import.meta.env.VITE_CLIENT_SECRET}`);
      const apiUrl = `${import.meta.env.VITE_API_URL}/oauth/register`;
      console.log('Attempting to register with URL:', apiUrl);
      console.log('Environment variables:', {
        VITE_API_URL: import.meta.env.VITE_API_URL,
        VITE_CLIENT_ID: import.meta.env.VITE_CLIENT_ID,
        VITE_CLIENT_SECRET: import.meta.env.VITE_CLIENT_SECRET
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