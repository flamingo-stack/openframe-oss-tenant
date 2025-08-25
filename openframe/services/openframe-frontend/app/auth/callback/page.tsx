'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get callback parameters
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('🔄 [OAuth Callback] Received callback:', { code, state, error })

    if (error) {
      console.error('❌ [OAuth Callback] Authentication error:', error)
      // Redirect back to auth page with error
      router.push('/auth?error=' + encodeURIComponent(error))
    } else if (code) {
      console.log('✅ [OAuth Callback] Authentication successful, redirecting to dashboard')
      // Simulate successful authentication - redirect to dashboard
      // In a real implementation, you would exchange the code for tokens
      router.push('/dashboard')
    } else {
      console.log('⚠️ [OAuth Callback] No code or error, redirecting to auth')
      router.push('/auth')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ods-text-primary mb-4">
          Processing Authentication...
        </h1>
        <p className="text-ods-text-secondary">
          Please wait while we complete your sign in.
        </p>
      </div>
    </div>
  )
}