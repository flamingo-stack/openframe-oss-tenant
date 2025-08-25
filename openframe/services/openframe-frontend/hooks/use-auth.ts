'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useLocalStorage } from '@flamingo/ui-kit/hooks'

interface TenantInfo {
  tenantId?: string
  tenantName: string
  tenantDomain: string
}

interface TenantDiscoveryResponse {
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
  
  // Use UI Kit's localStorage hook for persistent state
  const [email, setEmail] = useLocalStorage('auth:email', '')
  const [tenantInfo, setTenantInfo] = useLocalStorage<TenantInfo | null>('auth:tenantInfo', null)
  const [hasDiscoveredTenants, setHasDiscoveredTenants] = useLocalStorage('auth:hasDiscoveredTenants', false)
  const [availableProviders, setAvailableProviders] = useLocalStorage<string[]>('auth:availableProviders', [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Track when localStorage is initialized
  useEffect(() => {
    // Wait for at least one render cycle to ensure localStorage hooks are initialized
    setIsInitialized(true)
  }, [])

  const discoverTenants = async (userEmail: string) => {
    setIsLoading(true)
    setEmail(userEmail)
    
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api').replace('/api', '')
      const response = await fetch(`${baseUrl}/sas/tenant/discover?email=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: TenantDiscoveryResponse = await response.json()
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
        
        console.log('✅ [Tenant Discovery] Found existing account:', data.tenant_id)
      } else {
        setHasDiscoveredTenants(false)
        console.log('🔍 [Tenant Discovery] No existing accounts found for email:', userEmail)
      }
    } catch (error) {
      console.error('Tenant discovery failed:', error)
      
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : "Unable to check for existing accounts",
        variant: "destructive"
      })
      setHasDiscoveredTenants(false)
    } finally {
      setIsLoading(false)
    }
  }

  const registerOrganization = async (data: RegisterRequest) => {
    setIsLoading(true)
    
    try {
      console.log('📝 [Auth] Attempting organization registration:', data.tenantName)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api'
      const response = await fetch(`${apiUrl.replace('/api', '')}/sas/oauth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          tenantName: data.tenantName,
          tenantDomain: data.tenantDomain || 'localhost'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }

      const result = await response.json()
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
          sessionStorage.setItem('auth:tenant_id', tenantInfo.tenantId)
          
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

  const reset = () => {
    setEmail('')
    setTenantInfo(null)
    setHasDiscoveredTenants(false)
    setIsLoading(false)
  }

  return {
    email,
    tenantInfo,
    hasDiscoveredTenants,
    availableProviders,
    isLoading,
    isInitialized,
    discoverTenants,
    registerOrganization,
    loginWithSSO,
    reset
  }
}