'use client'

import { AuthSignupSection } from '@app/auth/components/signup-section'
import { AuthLayout } from '@app/auth/layouts'
import { useAuth } from '@app/auth/hooks/use-auth'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const { isLoading, registerOrganization, loginWithSSO } = useAuth()

  // Get stored org details
  const storedOrgName = typeof window !== 'undefined' ? sessionStorage.getItem('auth:org_name') || '' : ''
  const storedDomain = typeof window !== 'undefined' ? sessionStorage.getItem('auth:domain') || 'localhost' : 'localhost'

  const handleSignupSubmit = (data: any) => {
    registerOrganization(data)
  }

  const handleSSOSignup = async (provider: string) => {
    // Store org details for after SSO callback
    if (storedOrgName) {
      sessionStorage.setItem('auth:signup_org', storedOrgName)
      sessionStorage.setItem('auth:signup_domain', storedDomain)
    }
    
    // Redirect to SSO provider for signup
    // The provider will handle new user creation
    await loginWithSSO(provider)
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
        onSSO={handleSSOSignup}
        onBack={handleBack}
        isLoading={isLoading}
      />
    </AuthLayout>
  )
}