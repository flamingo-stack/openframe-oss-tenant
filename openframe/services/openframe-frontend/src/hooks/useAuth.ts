import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check authentication status via server endpoint
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/oauth/me', {
        method: 'GET',
        credentials: 'include' // Include HTTP-only cookies
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        return true
      } else {
        setUser(null)
        return false
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Fetch available SSO providers
  const [ssoProviders, setSSOProviders] = useState<any[]>([])
  
  const fetchSSOProviders = async () => {
    try {
      const response = await fetch('/api/sso/providers/available', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const providers = await response.json()
        setSSOProviders(providers)
      }
    } catch (error) {
      console.error('Failed to fetch SSO providers:', error)
    }
  }

  // SSO Login with dynamic providers
  const loginWithSSO = (providerId: string) => {
    window.location.href = `/api/oauth/authorize?provider=${providerId}&redirect_uri=${encodeURIComponent(window.location.origin)}`
  }

  // Legacy methods for backward compatibility
  const loginWithGoogle = () => loginWithSSO('google')
  const loginWithAzure = () => loginWithSSO('azure')

  // User registration
  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await fetch('/api/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, firstName, lastName })
    })

    if (response.ok) {
      await checkAuthStatus()
      return true
    } else {
      const error = await response.json()
      throw new Error(error.message || 'Registration failed')
    }
  }

  // Traditional login
  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('grant_type', 'password')
    formData.append('username', email)
    formData.append('password', password)
    formData.append('client_id', 'openframe_web_dashboard')
    formData.append('scope', 'openid profile email')

    const response = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'include', // Include cookies
      body: formData
    })

    if (response.ok) {
      // Tokens are set as HTTP-only cookies by server
      await checkAuthStatus()
      return true
    } else {
      const error = await response.json()
      throw new Error(error.error_description || 'Login failed')
    }
  }

  // Logout
  const logout = async () => {
    try {
      await fetch('/api/oauth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.warn('Logout request failed:', error)
    }
    
    setUser(null)
    window.location.href = '/login'
  }

  // Check auth and fetch providers on mount
  useEffect(() => {
    checkAuthStatus()
    fetchSSOProviders()
  }, [])

  return {
    user,
    loading,
    ssoProviders,
    isAuthenticated: !!user,
    login,
    register,
    loginWithSSO,
    loginWithGoogle,
    loginWithAzure,
    logout,
    checkAuthStatus
  }
}