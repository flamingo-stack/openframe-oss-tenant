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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    loading: false,
    error: null as string | null
  }),
  actions: {
    setAuthenticated(isAuthenticated: boolean) {
      this.isAuthenticated = isAuthenticated;
    },
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    setError(error: string | null) {
      this.error = error;
    },
    logout() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.isAuthenticated = false;
    }
  }
}) 