'use client'

import { useState } from 'react'

interface TenantInfo {
  tenantName: string
  tenantDomain: string
}

interface RegisterRequest {
  tenantName: string
  tenantDomain: string
  firstName: string
  lastName: string
  email: string
  password: string
}

type AuthStep = 'choice' | 'signup' | 'login-email' | 'login-providers'

export function useAuth() {
  const [step, setStep] = useState<AuthStep>('choice')
  const [email, setEmail] = useState('')
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [hasDiscoveredTenants, setHasDiscoveredTenants] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<string[]>(['google', 'microsoft'])
  const [isLoading, setIsLoading] = useState(false)

  const discoverTenants = async (userEmail: string) => {
    setIsLoading(true)
    setEmail(userEmail)
    
    try {
      // TODO: Implement actual tenant discovery API call
      // For now, simulate the discovery
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock response - in real implementation, this would come from the API
      setTenantInfo({
        tenantName: 'Demo Organization',
        tenantDomain: 'demo'
      })
      setHasDiscoveredTenants(true)
      setStep('login-providers')
    } catch (error) {
      console.error('Tenant discovery failed:', error)
      setHasDiscoveredTenants(false)
    } finally {
      setIsLoading(false)
    }
  }

  const registerOrganization = async (data: RegisterRequest) => {
    setIsLoading(true)
    
    try {
      // TODO: Implement actual registration API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock success - redirect to dashboard
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Registration failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithSSO = async (provider: string) => {
    setIsLoading(true)
    
    try {
      // TODO: Implement actual SSO login
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock success - redirect to dashboard
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('SSO login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setStep('choice')
    setEmail('')
    setTenantInfo(null)
    setHasDiscoveredTenants(false)
    setIsLoading(false)
  }

  return {
    step,
    email,
    tenantInfo,
    hasDiscoveredTenants,
    availableProviders,
    isLoading,
    setStep,
    discoverTenants,
    registerOrganization,
    loginWithSSO,
    reset
  }
}