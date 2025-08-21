'use client'

import { AuthSignupSection } from '@/app/_components/openframe-auth/auth-signup-section'
import { AuthLayout } from '@/app/_components/openframe-auth/auth-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const { isLoading, registerOrganization } = useAuth()

  // Get stored org details
  const storedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('auth:org_name') || '' : ''
  const storedDomain = typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || 'localhost' : 'localhost'

  const handleSignupSubmit = (data: any) => {
    registerOrganization(data)
  }

  const handleBack = () => {
    router.push('/auth/')
  }

  return (
    <AuthLayout>
      <AuthSignupSection
        orgName={storedOrgName}
        domain={storedDomain}
        onSubmit={handleSignupSubmit}
        onBack={handleBack}
        isLoading={isLoading}
      />
    </AuthLayout>
  )
}