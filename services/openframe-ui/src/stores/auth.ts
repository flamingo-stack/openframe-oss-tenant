import { defineStore } from 'pinia'
import { ref } from 'vue'
import { OAuthError } from '@/errors/OAuthError'
import { AuthService } from '@/services/AuthService'

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
    async login(email: string, password: string) {
      try {
        this.setLoading(true);
        this.setError(null);
        const response = await AuthService.login({ email, password });
        this.setAuthenticated(true);
        return response;
      } catch (error) {
        this.setError(error instanceof Error ? error.message : 'Login failed');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    async register(email: string, password: string, firstName?: string, lastName?: string) {
      try {
        this.setLoading(true);
        this.setError(null);
        const response = await AuthService.register({ 
          email, 
          password, 
          firstName, 
          lastName,
          confirmPassword: password 
        });
        this.setAuthenticated(true);
        return response;
      } catch (error) {
        this.setError(error instanceof Error ? error.message : 'Registration failed');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },
    logout() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.isAuthenticated = false;
    }
  }
}) 