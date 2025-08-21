import { useAuth } from '@/hooks/use-auth'
import { AuthBenefitsSection } from './auth-benefits-section'
import { AuthChoiceSection } from './auth-choice-section'
import { AuthSignupSection } from './auth-signup-section'
import { AuthLoginSection } from './auth-login-section'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigation, authRoutes } from '@/lib/navigation'

/**
 * Main auth page component following multi-platform-hub pattern
 * Splits authentication flow into reusable sections
 */
export default function OpenFrameAuthPage() {
  const { navigateTo, replace } = useNavigation()
  const location = useLocation()
  const {
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
  } = useAuth()

  // Sync URL with auth step
  useEffect(() => {
    const path = location.pathname
    if (path === '/auth/signup') {
      setStep('signup')
    } else if (path === '/auth/login') {
      setStep('login-providers')
    } else if (path === '/auth') {
      setStep('choice')
    }
  }, [location.pathname, setStep])

  // Check for OAuth errors in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const error = urlParams.get('error')
    const message = urlParams.get('message')
    
    if (error === 'oauth_failed' && message) {
      // Handle OAuth failure
      console.error('OAuth failed:', message)
      
      // Clean the URL and reset auth state
      replace(authRoutes.choice)
      reset()
    }
  }, [location.search, replace, reset])

  const handleCreateOrganization = (orgName: string, domain: string) => {
    // Store org details and move to signup screen
    sessionStorage.setItem('auth:org_name', orgName)
    sessionStorage.setItem('auth:domain', domain)
    setStep('signup')
    // Navigate to signup URL for proper browser history
    navigateTo(authRoutes.signup)
  }

  const handleSignIn = (email: string) => {
    discoverTenants(email)
    // Navigate to login URL for proper browser history
    navigateTo(authRoutes.login)
  }

  const handleSignupSubmit = (data: any) => {
    registerOrganization(data)
  }

  const handleSSO = async (provider: string) => {
    await loginWithSSO(provider)
  }

  const handleBack = () => {
    // Navigate back to auth choice screen and update URL
    setStep('choice')
    navigateTo(authRoutes.choice)
  }

  // Get stored org details for signup screen
  const storedOrgName = sessionStorage.getItem('auth:org_name') || ''
  const storedDomain = sessionStorage.getItem('auth:domain') || 'localhost'

  // Render appropriate screen based on step
  switch (step) {
    case 'choice':
      return (
        <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
          <AuthChoiceSection
            onCreateOrganization={handleCreateOrganization}
            onSignIn={handleSignIn}
            isLoading={isLoading}
          />
          <AuthBenefitsSection />
        </div>
      )

    case 'signup':
      return (
        <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
          <AuthSignupSection
            orgName={storedOrgName}
            domain={storedDomain}
            onSubmit={handleSignupSubmit}
            onBack={handleBack}
            isLoading={isLoading}
          />
          <AuthBenefitsSection />
        </div>
      )

    case 'login-email':
      return (
        <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
          <AuthChoiceSection
            onCreateOrganization={handleCreateOrganization}
            onSignIn={handleSignIn}
            isLoading={isLoading}
          />
          <AuthBenefitsSection />
        </div>
      )

    case 'login-providers':
      return (
        <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
          <AuthLoginSection
            email={email}
            tenantInfo={tenantInfo}
            hasDiscoveredTenants={hasDiscoveredTenants}
            availableProviders={availableProviders}
            onSSO={handleSSO}
            onBack={handleBack}
            isLoading={isLoading}
          />
          <AuthBenefitsSection />
        </div>
      )

    default:
      return (
        <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
          <AuthChoiceSection
            onCreateOrganization={handleCreateOrganization}
            onSignIn={handleSignIn}
            isLoading={isLoading}
          />
          <AuthBenefitsSection />
        </div>
      )
  }
}