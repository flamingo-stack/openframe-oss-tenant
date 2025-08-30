'use client'

import { AuthChoiceSection } from '@app/auth/components/choice-section'
import { AuthLayout } from '@app/auth/layouts'
import { AuthGuard } from '@app/auth/components/auth-guard'
import { useAuth } from '@app/auth/hooks/use-auth'
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

  const handleSignIn = async (email: string) => {
    await discoverTenants(email)
    router.push('/auth/login')
  }

  return (
    <AuthGuard requireAuth={false}>
      <AuthLayout>
        <AuthChoiceSection
          onCreateOrganization={handleCreateOrganization}
          onSignIn={handleSignIn}
          isLoading={isLoading}
        />
      </AuthLayout>
    </AuthGuard>
  )
}