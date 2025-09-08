'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useLocalStorage } from '@flamingo/ui-kit/hooks'
import { useAuthStore } from '../stores/auth-store'
import { useTokenStorage } from './use-token-storage'
import { apiClient } from 'lib/api-client'

interface TenantInfo {
  tenantId?: string
  tenantName: string
  tenantDomain: string
}

export interface TenantDiscoveryResponse {
  email: string
  has_existing_accounts: boolean
  tenant_id?: string | null
  auth_providers?: string[] | null
}

interface RegisterRequest {
  tenantName: string
  tenantDomain: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export function useAuth() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Auth store for managing authentication state
  const { login: storeLogin, user, isAuthenticated, setTenantId } = useAuthStore()
  
  // Token storage for managing tokens in localStorage
  const { getAccessToken, storeAccessToken, storeRefreshToken, clearTokens } = useTokenStorage()
  
  // Use UI Kit's localStorage hook for persistent state
  const [email, setEmail] = useLocalStorage('auth:email', '')
  const [tenantInfo, setTenantInfo] = useLocalStorage<TenantInfo | null>('auth:tenantInfo', null)
  const [hasDiscoveredTenants, setHasDiscoveredTenants] = useLocalStorage('auth:hasDiscoveredTenants', false)
  const [availableProviders, setAvailableProviders] = useLocalStorage<string[]>('auth:availableProviders', [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [discoveryAttempted, setDiscoveryAttempted] = useState(false)

  // Handle successful authentication from any source
  const handleAuthenticationSuccess = useCallback(
    (token: string, userData: any, redirectPath?: string) => {
      console.log('✅ [Auth] Handling successful authentication')
      
      // Store token in localStorage using the token storage hook
      storeAccessToken(token)
      
      // If there's a refresh token, store it too
      if (userData.refreshToken) {
        storeRefreshToken(userData.refreshToken)
      }
      
      // Format user data for auth store
      const user = {
        id: userData.id || userData.userId || '',
        email: userData.email || email || '',
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || '',
        organizationId: userData.organizationId || userData.tenantId || tenantInfo?.tenantId,
        organizationName: userData.organizationName || userData.tenantName || tenantInfo?.tenantName,
        role: userData.role || 'user'
      }
      
      console.log('🔐 [Auth] User data:', userData)
      console.log('🔐 [Auth] Token:', token)

      // Store in auth store
      storeLogin(user)
      
      // Store tenant ID if available
      const tenantId = userData.tenantId || userData.organizationId || tenantInfo?.tenantId
      if (tenantId) {
        setTenantId(tenantId)
      }
      
      console.log('✅ [Auth] User authenticated:', user.email)
      
      toast({
        title: 'Welcome!',
        description: `Successfully signed in as ${user.name || user.email}`,
        variant: 'success',
      })
      
      // Clear auth flow data
      setHasDiscoveredTenants(false)
      setDiscoveryAttempted(false)
      setAvailableProviders([])
      
      // Redirect if specified or if on auth page
      if (redirectPath) {
        router.push(redirectPath)
      } else if (pathname?.startsWith('/auth')) {
        // If on auth page and successfully authenticated, redirect to dashboard
        console.log('🔄 [Auth] Redirecting to dashboard after successful authentication')
        router.push('/dashboard')
      }
    },
    [email, tenantInfo, storeAccessToken, storeRefreshToken, storeLogin, toast, router, setHasDiscoveredTenants, setDiscoveryAttempted, setAvailableProviders, setTenantId, pathname]
  )

  // Track when localStorage is initialized
  useEffect(() => {
    // Wait for at least one render cycle to ensure localStorage hooks are initialized
    setIsInitialized(true)
  }, [])
  
  // Check for existing authentication on mount and periodically
  useEffect(() => {
    // Check if we just returned from OAuth (has devTicket or state parameter)
    const hasOAuthCallback = searchParams?.has('devTicket') || searchParams?.has('state') || searchParams?.has('code')
    
    // Skip auth checks when on auth pages UNLESS we just returned from OAuth
    const isAuthPage = pathname?.startsWith('/auth')
    if (isAuthPage && !hasOAuthCallback) {
      console.log('🔐 [Auth] Skipping auth check on auth page:', pathname)
      return
    }
    
    // If we have OAuth callback parameters, force an immediate auth check
    if (hasOAuthCallback) {
      console.log('🔐 [Auth] OAuth callback detected, forcing auth check')
    }

    const checkExistingAuth = async (isPeriodicCheck = false) => {
      // For initial check, skip if already authenticated
      if (!isPeriodicCheck && isAuthenticated) {
        return
      }
      
      try {
        if (!isPeriodicCheck) {
          console.log('🔐 [Auth] Initial authentication check via /me endpoint...')
        }
        
        // Use the API client which handles both cookie and header auth automatically
        const response = await apiClient.get('/me')
        
        if (response.ok && response.data && response.data.authenticated) {
          const userData = response.data.user
          
          if (!isPeriodicCheck) {
            console.log('✅ [Auth] User authenticated via /me endpoint:', userData)
          }
          
          // Get token from localStorage if DevTicket is enabled, otherwise use placeholder
          const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
          const token = isDevTicketEnabled ? getAccessToken() : 'cookie-auth'
          
          if (userData && userData.email) {
            // For initial check or if user data changed, update auth store
            if (!isPeriodicCheck || !isAuthenticated) {
              handleAuthenticationSuccess(token || 'cookie-auth', userData)
            }
          }
        } else if (response.status === 401) {
          if (isPeriodicCheck && isAuthenticated) {
            // User was authenticated but now token is expired/invalid
            console.log('⚠️ [Auth] Session expired, logging out...')
            
            // Clear auth store
            const { logout } = useAuthStore.getState()
            logout()
            
            // Clear tokens
            const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
            if (isDevTicketEnabled) {
              localStorage.removeItem('of_access_token')
              localStorage.removeItem('of_refresh_token')
            }
            
            // Show notification
            toast({
              title: 'Session Expired',
              description: 'Your session has expired. Please sign in again.',
              variant: 'destructive',
            })
            
            // Redirect to auth page
            router.push('/auth')
          } else if (!isPeriodicCheck) {
            console.log('⚠️ [Auth] Not authenticated (401 from /me)')
            
            // Clear any stale tokens if DevTicket is enabled
            const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
            if (isDevTicketEnabled) {
              const token = getAccessToken()
              if (token) {
                console.log('🔐 [Auth] Clearing stale tokens')
                localStorage.removeItem('of_access_token')
                localStorage.removeItem('of_refresh_token')
              }
            }
          }
        } else if (isPeriodicCheck && isAuthenticated && response.status >= 400) {
          // Some error occurred during periodic check
          console.log('⚠️ [Auth] Periodic auth check failed with status:', response.status)
        }
      } catch (error) {
        if (isPeriodicCheck) {
          console.error('❌ [Auth] Periodic auth check failed:', error)
        } else {
          console.error('❌ [Auth] Initial auth check failed:', error)
        }
      }
    }
    
    // Run initial check after a short delay
    const initialTimer = setTimeout(() => checkExistingAuth(false), 100)
    
    // Set up periodic check interval (configurable via env var, default 5 minutes)
    const authCheckInterval = parseInt(process.env.NEXT_PUBLIC_AUTH_CHECK_INTERVAL || '300000', 10)
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        checkExistingAuth(true)
      }
    }, authCheckInterval)
    
    // Cleanup
    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalId)
    }
  }, [getAccessToken, isAuthenticated, handleAuthenticationSuccess, toast, router, pathname, searchParams])

  const discoverTenants = async (userEmail: string): Promise<TenantDiscoveryResponse | null> => {
    setIsLoading(true)
    
    // If email is different from stored email, reset discovery state
    if (userEmail !== email) {
      setDiscoveryAttempted(false)
      setHasDiscoveredTenants(false)
      setTenantInfo(null)
      setAvailableProviders([])
    }
    
    setEmail(userEmail)
    
    try {
      // Use external API call since this goes to a different base path
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api').replace('/api', '')
      const response = await apiClient.external(
        `${baseUrl}/sas/tenant/discover?email=${encodeURIComponent(userEmail)}`,
        { method: 'GET', skipAuth: true } // Skip auth for tenant discovery
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = response.data as TenantDiscoveryResponse
      console.log('🔍 [Tenant Discovery] Response:', data)
      
      // Check if user has existing accounts
      if (data.has_existing_accounts && data.tenant_id) {
        const tenantInfo = {
          tenantId: data.tenant_id,
          tenantName: '', // Not provided by API
          tenantDomain: 'localhost' // Default for local development
        }
        const providers = data.auth_providers || ['openframe-sso']
        
        setTenantInfo(tenantInfo)
        setAvailableProviders(providers)
        setHasDiscoveredTenants(true)
        
        // Store tenant ID in auth store (in memory) for token refresh
        setTenantId(data.tenant_id)
        
        console.log('✅ [Tenant Discovery] Found existing account:', data.tenant_id)
      } else {
        setHasDiscoveredTenants(false)
        console.log('🔍 [Tenant Discovery] No existing accounts found for email:', userEmail)
      }
      
      // Mark discovery as attempted after successful API call
      setDiscoveryAttempted(true)
      
      // Return the response data
      return data
    } catch (error) {
      console.error('Tenant discovery failed:', error)
      
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Unable to check for existing accounts",
        variant: "destructive"
      })
      setHasDiscoveredTenants(false)
      // Mark as attempted even on error to prevent spam
      setDiscoveryAttempted(true)
      
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const registerOrganization = async (data: RegisterRequest) => {
    setIsLoading(true)
    
    try {
      console.log('📝 [Auth] Attempting organization registration:', data.tenantName)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api'
      const baseUrl = apiUrl.replace('/api', '')
      
      const response = await apiClient.external(
        `${baseUrl}/sas/oauth/register`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            password: data.password,
            tenantName: data.tenantName,
            tenantDomain: data.tenantDomain || 'localhost'
          }),
          skipAuth: true // Skip auth for registration
        }
      )

      if (!response.ok) {
        const errorMessage = response.data?.message || response.error || 'Registration failed'
        throw new Error(errorMessage)
      }

      const result = response.data
      console.log('✅ [Auth] Registration successful:', result)
      
      toast({
        title: "Success!",
        description: "Organization created successfully. You can now sign in.",
        variant: "success"
      })
      
      // Redirect to login after successful registration
      window.location.href = '/auth/login'
    } catch (error: any) {
      console.error('❌ [Auth] Registration failed:', error)
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Unable to create organization",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithSSO = async (provider: string) => {
    setIsLoading(true)
    
    try {
      console.log('🔄 [Auth] Starting SSO login with provider:', provider)
      
      if (provider === 'openframe-sso') {
        // Store tenant ID and redirect to Gateway OAuth login
        if (tenantInfo?.tenantId) {
          // Store tenant ID in auth store for token refresh
          setTenantId(tenantInfo.tenantId)
          
          // Determine return URL based on environment
          const getReturnUrl = () => {
            const hostname = window.location.hostname
            const protocol = window.location.protocol
            const port = window.location.port ? `:${window.location.port}` : ''
            
            // For development (localhost)
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
              return `${protocol}//${hostname}${port}/dashboard`
            }
            // For production or other environments
            return `${window.location.origin}/dashboard`
          }
          
          const returnUrl = encodeURIComponent(getReturnUrl())
          const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api').replace('/api', '')
          const loginUrl = `${baseUrl}/oauth/login?tenantId=${encodeURIComponent(tenantInfo.tenantId)}&returnUrl=${returnUrl}`
          
          console.log('🔄 [Auth] Redirecting to OpenFrame SSO:', loginUrl)
          console.log('🔄 [Auth] Return URL after auth:', getReturnUrl())
          
          window.location.href = loginUrl
        } else {
          throw new Error('No tenant information available for SSO login')
        }
      } else {
        // For other providers, implement their specific OAuth flows
        throw new Error(`SSO provider '${provider}' not yet implemented`)
      }
    } catch (error) {
      console.error('❌ [Auth] SSO login failed:', error)
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Unable to sign in with SSO",
        variant: "destructive"
      })
      setIsLoading(false) // Only set loading false on error, success will navigate away
    }
  }

  const logout = useCallback(() => {
    console.log('🔐 [Auth] Logging out user')
    
    // Clear auth store
    const { logout: storeLogout } = useAuthStore.getState()
    storeLogout()
    
    // Clear tokens if DevTicket is enabled
    const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
    if (isDevTicketEnabled) {
      clearTokens()
    }
    
    // Reset auth flow state
    setEmail('')
    setTenantInfo(null)
    setHasDiscoveredTenants(false)
    setDiscoveryAttempted(false)
    setAvailableProviders([])
    setIsLoading(false)
    
    console.log('✅ [Auth] Logout completed')
  }, [clearTokens, setEmail, setTenantInfo, setHasDiscoveredTenants, setDiscoveryAttempted, setAvailableProviders])

  const reset = () => {
    setEmail('')
    setTenantInfo(null)
    setHasDiscoveredTenants(false)
    setDiscoveryAttempted(false)
    setIsLoading(false)
  }

  return {
    email,
    tenantInfo,
    hasDiscoveredTenants,
    discoveryAttempted,
    availableProviders,
    isLoading,
    isInitialized,
    discoverTenants,
    registerOrganization,
    loginWithSSO,
    logout,
    reset
  }
}