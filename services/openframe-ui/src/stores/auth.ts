import { defineStore } from 'pinia'
import { AuthService, type LoginCredentials, type RegisterCredentials, type TokenResponse, type UserInfo } from '@/services/AuthService'
import router from '@/router'

export interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  refreshing: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: AuthService.getAccessToken(),
    user: null,
    isAuthenticated: AuthService.isAuthenticated(),
    refreshing: false
  }),

  actions: {
    async login(email: string, password: string): Promise<TokenResponse> {
      try {
        const response = await AuthService.login({ email, password })
        this.token = response.access_token
        this.isAuthenticated = true
        return response
      } catch (error) {
        this.handleLogout()
        throw error
      }
    },

    async register(credentials: RegisterCredentials): Promise<TokenResponse> {
      try {
        const response = await AuthService.register(credentials)
        this.token = response.access_token
        this.isAuthenticated = true
        return response
      } catch (error) {
        this.handleLogout()
        throw error
      }
    },

    async fetchUserInfo(): Promise<void> {
      try {
        this.user = await AuthService.getUserInfo()
      } catch (error) {
        await this.handleAuthError(error)
        throw error
      }
    },

    async handleAuthError(error: any): Promise<void> {
      // Check if error is a token expiration or invalid token error
      if (error?.response?.status === 401 || 
          error?.response?.data?.error === 'invalid_token' ||
          error?.message?.includes('Token refresh failed')) {
        
        // If we're already refreshing, wait for it to complete
        if (this.refreshing) {
          return
        }

        this.refreshing = true
        try {
          // Attempt to refresh the token
          const refreshToken = AuthService.getRefreshToken()
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          const response = await AuthService.refreshToken(refreshToken)
          this.token = response.access_token
          this.isAuthenticated = true
          return
        } catch (refreshError: any) {
          // If refresh fails, check if it's due to expired token
          if (refreshError?.response?.data?.error === 'invalid_token' ||
              refreshError?.response?.data?.error_description?.includes('expired')) {
            console.warn('Token refresh failed - expired token:', refreshError?.response?.data?.error_description)
          } else {
            console.error('Token refresh failed:', refreshError)
          }
          await this.handleLogout()
        } finally {
          this.refreshing = false
        }
      }
    },

    async handleLogout() {
      AuthService.logout()
      this.token = null
      this.user = null
      this.isAuthenticated = false
      this.refreshing = false
      
      // Only redirect to login if we're not already there
      if (router.currentRoute.value.name !== 'login') {
        await router.push('/login')
      }
    },

    // Alias for handleLogout to maintain backward compatibility
    logout() {
      return this.handleLogout()
    }
  }
}) 