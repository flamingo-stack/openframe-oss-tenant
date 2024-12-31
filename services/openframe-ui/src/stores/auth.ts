import { defineStore } from 'pinia'
import { ref } from 'vue'

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
      formData.append('client_id', 'openframe_web_dashboard');
      formData.append('client_secret', 'prod_secret');
      formData.append('scope', 'openid profile email');

      const response = await fetch('http://localhost:8090/oauth/token', {
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
    formData.append('client_id', 'openframe_web_dashboard');
    formData.append('client_secret', 'prod_secret');

    const response = await fetch('http://localhost:8090/oauth/token', {
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

  return {
    isAuthenticated,
    login,
    refreshToken,
    setTokens,
    logout,
    handleAuthError
  }
}) 