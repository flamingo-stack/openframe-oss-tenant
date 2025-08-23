'use client'

import { useEffect } from 'react'
import { AuthChoiceSection } from '@/app/_components/openframe-auth/auth-choice-section'
import { AuthLayout } from '@/app/_components/openframe-auth/auth-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@flamingo/ui-kit/hooks'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isLoading, discoverTenants, checkAuthStatus } = useAuth()

  useEffect(() => {
    // Check if user is already authenticated
    const verifyExistingAuth = async () => {
      try {
        const { isAuthenticated } = await checkAuthStatus()
        if (isAuthenticated) {
          console.log('✅ [Auth Page] User already authenticated, redirecting to dashboard')
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.log('🔍 [Auth Page] User not authenticated, continuing to auth flow')
      }
    }

    // Show error message if redirected here from callback
    const error = searchParams.get('error')
    if (error) {
      console.error('❌ [Auth Page] OAuth error:', error)
      toast({
        title: "Authentication Error",
        description: decodeURIComponent(error),
        variant: "destructive"
      })
      
      // Clear the error from URL
      router.replace('/auth')
    } else {
      verifyExistingAuth()
    }
  }, [searchParams, router, checkAuthStatus, toast])

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
    <AuthLayout>
      <AuthChoiceSection
        onCreateOrganization={handleCreateOrganization}
        onSignIn={handleSignIn}
        isLoading={isLoading}
      />
    </AuthLayout>
  )
}