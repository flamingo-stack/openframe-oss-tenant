'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@app/auth/stores/auth-store'
import { getDefaultRedirectPath, isAuthOnlyMode } from '../lib/app-mode'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    if (isAuthOnlyMode()) {
      if (isAuthenticated) {
        router.push('/auth/already-signed-in')
      } else {
        router.push('/auth')
      }
    } else {
      const redirectPath = getDefaultRedirectPath(isAuthenticated)
      router.push(redirectPath)
    }
  }, [router, isAuthenticated])

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