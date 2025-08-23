'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { checkAuthStatus } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const handleCallback = async () => {
      // Get callback parameters
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      console.log('🔄 [OAuth Callback] Processing callback...')

      if (error) {
        console.error('❌ [OAuth Callback] Authentication error:', error, errorDescription)
        setStatus('error')
        
        // Redirect back to auth page with error after a short delay
        setTimeout(() => {
          router.push('/auth?error=' + encodeURIComponent(errorDescription || error))
        }, 2000)
        return
      }

      try {
        // The gateway should have already processed the OAuth callback and set cookies
        // We just need to verify authentication and redirect to intended destination
        console.log('🔍 [OAuth Callback] Checking authentication status...')
        
        const { isAuthenticated, userProfile } = await checkAuthStatus()
        
        if (isAuthenticated) {
          console.log('✅ [OAuth Callback] Authentication successful for user:', userProfile?.email)
          setStatus('success')
          
          // Get intended destination or default to dashboard
          const intendedDestination = sessionStorage.getItem('auth:intended_destination') || '/dashboard'
          sessionStorage.removeItem('auth:intended_destination')
          
          console.log('🔄 [OAuth Callback] Redirecting to:', intendedDestination)
          
          // Small delay to show success message
          setTimeout(() => {
            router.push(intendedDestination)
          }, 1000)
        } else {
          console.error('❌ [OAuth Callback] Authentication failed - no valid session')
          setStatus('error')
          
          setTimeout(() => {
            router.push('/auth?error=' + encodeURIComponent('Authentication failed. Please try again.'))
          }, 2000)
        }
      } catch (error) {
        console.error('❌ [OAuth Callback] Callback processing failed:', error)
        setStatus('error')
        
        setTimeout(() => {
          router.push('/auth?error=' + encodeURIComponent('Authentication failed. Please try again.'))
        }, 2000)
      }
    }

    handleCallback()
  }, [searchParams, router, checkAuthStatus])

  const getStatusContent = () => {
    switch (status) {
      case 'processing':
        return {
          title: 'Processing Authentication...',
          description: 'Please wait while we complete your sign in.',
          color: 'text-ods-text-primary'
        }
      case 'success':
        return {
          title: 'Authentication Successful!',
          description: 'Redirecting you to your dashboard...',
          color: 'text-green-600'
        }
      case 'error':
        return {
          title: 'Authentication Failed',
          description: 'Redirecting you back to sign in...',
          color: 'text-red-600'
        }
    }
  }

  const content = getStatusContent()

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className={`text-2xl font-bold ${content.color} mb-4`}>
          {content.title}
        </h1>
        <p className="text-ods-text-secondary">
          {content.description}
        </p>
        
        {status === 'processing' && (
          <div className="mt-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ods-accent"></div>
          </div>
        )}
      </div>
    </div>
  )
}