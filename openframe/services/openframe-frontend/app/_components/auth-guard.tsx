'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter()
  const { checkAuthStatus } = useAuth()
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        console.log('🔍 [AuthGuard] Checking authentication status...')
        const { isAuthenticated } = await checkAuthStatus()
        
        if (isAuthenticated) {
          console.log('✅ [AuthGuard] User is authenticated')
          setAuthState('authenticated')
        } else {
          console.log('❌ [AuthGuard] User is not authenticated, redirecting to /auth')
          setAuthState('unauthenticated')
          
          // Store current path as intended destination
          const currentPath = window.location.pathname
          if (currentPath !== '/auth' && currentPath !== '/auth/callback') {
            sessionStorage.setItem('auth:intended_destination', currentPath)
          }
          
          router.push('/auth')
        }
      } catch (error) {
        console.error('❌ [AuthGuard] Auth check failed:', error)
        setAuthState('unauthenticated')
        router.push('/auth')
      }
    }

    verifyAuth()
  }, [checkAuthStatus, router])

  if (authState === 'checking') {
    return fallback || (
      <div className="min-h-screen bg-ods-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ods-accent mb-4"></div>
          <p className="text-ods-text-secondary">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return null // Router will redirect to auth page
  }

  return <>{children}</>
}