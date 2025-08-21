import { useState, useCallback } from 'react'
import { useToast, type ToastOptions } from '@flamingo/ui-kit/hooks'
import type { 
  AuthState, 
  AuthStep, 
  TenantInfo, 
  TenantDiscoveryResponse,
  RegisterRequest,
  AuthUser
} from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8100/api'

interface AuthService {
  discoverTenants: (email: string) => Promise<TenantDiscoveryResponse>
  registerOrganization: (data: RegisterRequest) => Promise<void>
  loginWithPassword: (email: string, password: string) => Promise<AuthUser>
  initiateSSO: (tenantId: string, provider: string) => Promise<void>
}

const authService: AuthService = {
  discoverTenants: async (email: string): Promise<TenantDiscoveryResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/discover-tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    
    if (!response.ok) {
      throw new Error('Failed to discover tenants')
    }
    
    return response.json()
  },

  registerOrganization: async (data: RegisterRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/register-organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Registration failed')
    }
  },

  loginWithPassword: async (email: string, password: string): Promise<AuthUser> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important for HTTP-only cookies
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      throw new Error('Login failed')
    }
    
    return response.json()
  },

  initiateSSO: async (tenantId: string, provider: string): Promise<void> => {
    // Store tenant info for after OAuth callback
    sessionStorage.setItem('auth:tenant_id', tenantId)
    
    // Redirect to OAuth endpoint
    const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8080'
    const loginUrl = `${gatewayUrl}/oauth/login?tenantId=${encodeURIComponent(tenantId)}&provider=${encodeURIComponent(provider)}`
    window.location.href = loginUrl
  }
}

export function useAuth() {
  const { toast } = useToast()
  
  const [authState, setAuthState] = useState<AuthState>({
    step: 'choice',
    email: '',
    tenantInfo: null,
    discoveredTenants: [],
    isLoading: false,
    error: null
  })

  const setStep = useCallback((step: AuthStep) => {
    setAuthState(prev => ({ ...prev, step, error: null }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setAuthState(prev => ({ ...prev, error, isLoading: false }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setAuthState(prev => ({ ...prev, isLoading }))
  }, [])

  const setEmail = useCallback((email: string) => {
    setAuthState(prev => ({ ...prev, email }))
  }, [])

  const discoverTenants = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Discovering tenants for email:', email)
      
      const response = await authService.discoverTenants(email)
      
      if (response.has_existing_accounts) {
        const tenantInfo: TenantInfo = {
          tenantId: response.tenant_id!,
          tenantName: response.tenant_name || '',
          tenantDomain: response.tenant_domain || 'localhost',
          authProviders: response.auth_providers || []
        }
        
        setAuthState(prev => ({
          ...prev,
          email,
          tenantInfo,
          discoveredTenants: [tenantInfo],
          step: 'login-providers',
          isLoading: false
        }))
        
        console.log('✅ Tenant discovered:', tenantInfo)
      } else {
        setAuthState(prev => ({
          ...prev,
          email,
          discoveredTenants: [],
          step: 'login-providers',
          isLoading: false
        }))
        
        console.log('⚠️ No organizations found for email')
      }
    } catch (error: any) {
      console.error('❌ Tenant discovery failed:', error)
      setError(error.message || 'Failed to discover organizations')
      
      const toastOptions: ToastOptions = {
        title: "Discovery Failed",
        description: error.message || "Failed to discover organizations",
        variant: "destructive"
      }
      toast(toastOptions)
    }
  }, [setLoading, setError, toast])

  const registerOrganization = useCallback(async (data: RegisterRequest) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📝 Registering organization:', data.tenantName)
      
      await authService.registerOrganization(data)
      
      const successToast: ToastOptions = {
        title: "Success",
        description: "Organization successfully registered. You can now sign in.",
        variant: "success"
      }
      toast(successToast)
      
      console.log('✅ Organization registered successfully')
      
      // Switch to login flow
      setAuthState(prev => ({
        ...prev,
        email: data.email,
        step: 'login-email',
        isLoading: false
      }))
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error)
      setError(error.message || 'Registration failed')
      
      const errorToast: ToastOptions = {
        title: "Registration Failed",
        description: error.message || "Failed to create organization",
        variant: "destructive"
      }
      toast(errorToast)
    }
  }, [setLoading, setError, toast])

  const loginWithSSO = useCallback(async (provider: string) => {
    if (!authState.tenantInfo?.tenantId) {
      setError('No organization selected')
      return
    }
    
    setLoading(true)
    
    try {
      console.log('🔗 Initiating SSO with provider:', provider)
      
      await authService.initiateSSO(authState.tenantInfo.tenantId, provider)
      
      // The page will redirect, so we won't reach this point
      
    } catch (error: any) {
      console.error('❌ SSO failed:', error)
      setError(error.message || 'SSO authentication failed')
      
      const ssoErrorToast: ToastOptions = {
        title: "SSO Failed",
        description: error.message || "SSO authentication failed",
        variant: "destructive"
      }
      toast(ssoErrorToast)
    }
  }, [authState.tenantInfo, setLoading, setError, toast])

  const goBack = useCallback(() => {
    if (authState.step === 'login-providers') {
      setStep('login-email')
    } else if (authState.step === 'login-email' || authState.step === 'signup') {
      setStep('choice')
    }
  }, [authState.step, setStep])

  const reset = useCallback(() => {
    setAuthState({
      step: 'choice',
      email: '',
      tenantInfo: null,
      discoveredTenants: [],
      isLoading: false,
      error: null
    })
  }, [])

  return {
    // State
    ...authState,
    
    // Actions
    setStep,
    setEmail,
    discoverTenants,
    registerOrganization,
    loginWithSSO,
    goBack,
    reset,
    
    // Computed
    hasDiscoveredTenants: authState.discoveredTenants.length > 0,
    selectedTenant: authState.tenantInfo,
    availableProviders: authState.tenantInfo?.authProviders || []
  }
}