import { defineStore } from 'pinia'
import { AuthService } from '../api/AuthService'

interface AuthState {
  token: string | null
  user: any | null
  isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('token'),
    user: null,
    isAuthenticated: !!localStorage.getItem('token')
  }),

  actions: {
    async login(email: string, password: string) {
      try {
        const response = await AuthService.login(email, password)
        this.token = response.access_token
        localStorage.setItem('token', response.access_token)
        this.isAuthenticated = true
        return response
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
    }
  }
}) 