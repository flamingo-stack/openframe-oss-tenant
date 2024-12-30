import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AuthService } from '../services/AuthService'
import { useRouter } from 'vue-router'
import { OAuthError } from '@/errors/OAuthError'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const router = useRouter()

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password })
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      isAuthenticated.value = true
      return response
    } catch (error) {
      await handleAuthError(error)
      throw error
    }
  }

  const logout = async () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    isAuthenticated.value = false
    await router.push('/login')
  }

  const handleAuthError = async (error: unknown) => {
    if (error instanceof OAuthError) {
      if (error.error === 'invalid_token' || error.error === 'invalid_grant') {
        await logout()
      }
    } else if (error instanceof Error) {
      await logout()
    }
  }

  return {
    isAuthenticated,
    login,
    logout,
    handleAuthError
  }
}) 