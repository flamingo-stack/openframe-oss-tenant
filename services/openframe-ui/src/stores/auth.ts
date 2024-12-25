import { defineStore } from 'pinia'
import { AuthService, type LoginCredentials, type RegisterCredentials, type TokenResponse, type UserInfo } from '@/services/AuthService'

export interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: AuthService.getAccessToken(),
    user: null,
    isAuthenticated: AuthService.isAuthenticated()
  }),

  actions: {
    async login(email: string, password: string): Promise<TokenResponse> {
      try {
        const response = await AuthService.login({ email, password })
        this.token = response.access_token
        this.isAuthenticated = true
        return response
      } catch (error) {
        this.logout()
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
        this.logout()
        throw error
      }
    },

    async fetchUserInfo(): Promise<void> {
      try {
        this.user = await AuthService.getUserInfo()
      } catch (error) {
        this.logout()
        throw error
      }
    },

    logout() {
      AuthService.logout()
      this.token = null
      this.user = null
      this.isAuthenticated = false
    }
  }
}) 