'use client'

import { AuthLoginSection } from '@/app/_components/openframe-auth/auth-login-section'
import { AuthLayout } from '@/app/_components/openframe-auth/auth-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { 
    email, 
    tenantInfo, 
    hasDiscoveredTenants, 
    availableProviders, 
    isLoading, 
    loginWithSSO 
  } = useAuth()

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