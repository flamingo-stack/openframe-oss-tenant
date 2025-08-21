'use client'

import { AuthChoiceSection } from '@/app/_components/openframe-auth/auth-choice-section'
import { AuthLayout } from '@/app/_components/openframe-auth/auth-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const { isLoading, discoverTenants } = useAuth()

  const handleCreateOrganization = (orgName: string, domain: string) => {
    // Store org details and navigate to signup screen
    sessionStorage.setItem('auth:org_name', orgName)
    sessionStorage.setItem('auth:domain', domain)
    router.push('/auth/signup/')
  }

  const handleSignIn = (email: string) => {
    discoverTenants(email)
    router.push('/auth/login/')
  }

  return (
    <AuthLayout>
      <AuthChoiceSection
        onCreateOrganization={handleCreateOrganization}
        onSignIn={handleSignIn}
        isLoading={isLoading}
      />
    </AuthLayout>
  )
}