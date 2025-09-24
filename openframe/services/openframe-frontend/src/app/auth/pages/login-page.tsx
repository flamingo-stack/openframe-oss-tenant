'use client'

import { AuthLoginSection } from '@app/auth/components/login-section'
import { AuthLayout } from '@app/auth/layouts'
import { useAuth } from '@app/auth/hooks/use-auth'
import { useAuthStore } from '@app/auth/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isAuthOnlyMode } from '@lib/app-mode'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { 
    email, 
    tenantInfo, 
    hasDiscoveredTenants,
    discoveryAttempted, 
    availableProviders, 
    isLoading, 
    isInitialized,
    loginWithSSO,
    discoverTenants 
  } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      if (isAuthOnlyMode()) {
        router.push('/auth/already-signed-in')
      } else {
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (!isInitialized) return
    
    if (email && !discoveryAttempted && !isLoading) {
      discoverTenants(email)
    } else if (!email && !isLoading) {
      router.push('/auth')
    }
  }, [email, discoveryAttempted, isLoading, isInitialized, discoverTenants, router])

  const handleSSO = async (provider: string) => {
    await loginWithSSO(provider)
  }

  const handleBack = () => {
    router.push('/auth/')
  }

  return (
    <AuthLayout>
      <AuthLoginSection
        email={email}
        tenantInfo={tenantInfo}
        hasDiscoveredTenants={hasDiscoveredTenants}
        availableProviders={availableProviders}
        onSSO={handleSSO}
        onBack={handleBack}
        isLoading={isLoading}
      />
    </AuthLayout>
  )
}