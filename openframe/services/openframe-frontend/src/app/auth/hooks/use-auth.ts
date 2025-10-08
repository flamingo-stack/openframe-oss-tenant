'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useLocalStorage } from '@flamingo/ui-kit/hooks'
import { useAuthStore } from '../stores/auth-store'
import { useTokenStorage } from './use-token-storage'
import { apiClient } from '@lib/api-client'
import { authApiClient } from '@lib/auth-api-client'
import { runtimeEnv } from '@lib/runtime-config'
import { clearStoredTokens } from '@lib/force-logout'

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
  const pathname = usePathname()
  
  // Use try-catch to handle static generation
  let searchParams
  try {
    searchParams = useSearchParams()
  } catch {
    // During static generation, create empty URLSearchParams
    searchParams = new URLSearchParams()
  }
  
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
        name: userData.name || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || '',
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
    const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
    if (isAuthPage && isDevTicketEnabled && !hasOAuthCallback) {
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
        
        // Call auth service for /me (shared host if provided, else relative); includes cookies and header token (dev)
        const response = await apiClient.me()
        
        if (response.ok && response.data && response.data.authenticated) {
          const userData = response.data.user
          
          if (!isPeriodicCheck) {
            console.log('✅ [Auth] User authenticated via /me endpoint:', userData)
          }
          
          // Get token from localStorage if DevTicket is enabled, otherwise use placeholder
          const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
          const token = isDevTicketEnabled ? getAccessToken() : 'cookie-auth'
          
          if (userData && userData.email) {
            // For initial check or if user data changed, update auth store
            if (!isPeriodicCheck || !isAuthenticated) {
              handleAuthenticationSuccess(token || 'cookie-auth', userData)
            }
          }
        } else if (response.status === 401) {
          if (isPeriodicCheck && isAuthenticated) {
            const { logout } = useAuthStore.getState()
            logout()
            
            clearStoredTokens()
            
            toast({
              title: 'Session Expired',
              description: 'Your session has expired. Please sign in again.',
              variant: 'destructive',
            })
            
            import('../../../lib/app-mode').then(({ getDefaultRedirectPath }) => {
              router.push(getDefaultRedirectPath(false))
            })
          } else if (!isPeriodicCheck) {
            const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
            if (isDevTicketEnabled) {
              const token = getAccessToken()
              if (token) {
                clearStoredTokens()
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
    const authCheckInterval = runtimeEnv.authCheckIntervalMs()
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
      // Use auth api client (shared host or relative) for discovery
      const response = await authApiClient.discoverTenants(userEmail)
      
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
      
      const response = await authApiClient.registerOrganization({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        tenantName: data.tenantName,
        tenantDomain: data.tenantDomain || 'localhost'
      })

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
      
      // Redirect to Gateway OAuth login for any provider listed by backend.
      if (tenantInfo?.tenantId) {
        // Store tenant ID in auth store for token refresh
        setTenantId(tenantInfo.tenantId)

        // Determine return URL based on environment
        const getReturnUrl = () => {
          const hostname = window.location.hostname
          const protocol = window.location.protocol
          const port = window.location.port ? `:${window.location.port}` : ''
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}${port}/dashboard`
          }
          return `${window.location.origin}/dashboard`
        }

        const returnUrl = encodeURIComponent(getReturnUrl())
        const loginUrl = authApiClient.loginUrl(tenantInfo.tenantId, returnUrl, provider)
        window.location.href = loginUrl
      } else {
        throw new Error('No tenant information available for SSO login')
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

  const logout = useCallback(async () => {
    console.log('🔐 [Auth] Logging out user')

    try {
      const { tenantId: storeTenantId } = useAuthStore.getState()
      const effectiveTenantId = storeTenantId || tenantInfo?.tenantId
      await authApiClient.logout(effectiveTenantId || undefined)
    } catch (error) {
      console.warn('⚠️ [Auth] Server logout request failed (continuing):', error)
    }
    
    // Clear auth store
    const { logout: storeLogout } = useAuthStore.getState()
    storeLogout()
    
    // Clear tokens if DevTicket is enabled
    const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver()
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
  }, [clearTokens, setEmail, setTenantInfo, setHasDiscoveredTenants, setDiscoveryAttempted, setAvailableProviders, tenantInfo])

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
    reset,
    handleAuthenticationSuccess,
    isAuthenticated,
    user
  }
}