'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@app/auth/stores/auth-store'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    // Check authentication status and redirect accordingly
    if (isAuthenticated) {
      console.log('🔐 [Home] User authenticated, redirecting to dashboard')
      router.push('/dashboard')
    } else {
      console.log('🔐 [Home] User not authenticated, redirecting to auth')
      router.push('/auth')
    }
  }, [router, isAuthenticated])

  // Show loading state while checking auth
  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ods-text-primary mb-4">
          Loading...
        </h1>
        <p className="text-ods-text-secondary">
          Please wait while we prepare your experience
        </p>
      </div>
    </div>
  )
}