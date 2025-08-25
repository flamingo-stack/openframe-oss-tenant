'use client'

import { AuthLoginSection } from '@/app/_components/openframe-auth/auth-login-section'
import { AuthLayout } from '@/app/_components/openframe-auth/auth-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const { 
    email, 
    tenantInfo, 
    hasDiscoveredTenants, 
    availableProviders, 
    isLoading, 
    isInitialized,
    loginWithSSO,
    discoverTenants 
  } = useAuth()

  // Auto-discover tenants if email exists but tenants haven't been discovered
  useEffect(() => {
    if (!isInitialized) return // Wait for localStorage to initialize
    
    if (email && !hasDiscoveredTenants && !isLoading) {
      discoverTenants(email)
    } else if (!email && !isLoading) {
      router.push('/auth')
    }
  }, [email, hasDiscoveredTenants, isLoading, isInitialized, discoverTenants, router])

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