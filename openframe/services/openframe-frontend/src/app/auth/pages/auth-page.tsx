'use client'

import { useEffect } from 'react'
import { AuthChoiceSection } from '@app/auth/components/choice-section'
import { AuthLayout } from '@app/auth/layouts'
import { useAuth } from '@app/auth/hooks/use-auth'
import { useAuthStore } from '@app/auth/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useToast } from '@flamingo/ui-kit/hooks'
import { isAuthOnlyMode } from '@lib/app-mode'

export default function AuthPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated } = useAuthStore()
  const { isLoading, discoverTenants } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleCreateOrganization = (orgName: string, domain: string, accessCode: string, email: string) => {
    // Store org details and navigate to signup screen
    sessionStorage.setItem('auth:org_name', orgName)
    sessionStorage.setItem('auth:domain', domain)
    sessionStorage.setItem('auth:access_code', accessCode)
    sessionStorage.setItem('auth:email', email)
    router.push('/auth/signup/')
  }

  const handleSignIn = async (email: string) => {
    const result = await discoverTenants(email)

    if (result && result.has_existing_accounts) {
      router.push('/auth/login')
    } else {
      toast({
        title: "Account Not Found",
        description: "You don't have an account yet. Please create an organization first.",
        variant: "destructive"
      })
    }
  }

  return (
    <AuthLayout>
      <AuthChoiceSection
        onCreateOrganization={handleCreateOrganization}
        onSignIn={handleSignIn}
      />
    </AuthLayout>
  )
}