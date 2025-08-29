'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@app/auth/stores/auth-store'
import { apiClient } from 'lib/api-client'
import { useTokenStorage } from '@app/auth/hooks/use-token-storage'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

/**
 * Auth Guard Component
 * Protects routes based on authentication status
 * Verifies authentication via /me endpoint before routing
 */
export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, login, logout } = useAuthStore()
  const { getAccessToken } = useTokenStorage()
  const [isChecking, setIsChecking] = useState(true)
  const [hasVerified, setHasVerified] = useState(false)

  useEffect(() => {
    const verifyAndCheckAuth = async () => {
      // Public routes that don't require authentication
      const publicRoutes = ['/auth', '/auth/login', '/auth/signup', '/auth/callback']
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

      // Skip verification for public routes when not authenticated
      if (!requireAuth && isPublicRoute && !isAuthenticated) {
        setIsChecking(false)
        return
      }

      // Verify authentication via /me endpoint
      if (!hasVerified) {
        try {
          console.log('🔐 [AuthGuard] Verifying authentication via /me endpoint...')
          
          // Use the API client which handles both cookie and header auth automatically
          const response = await apiClient.get('/me')
          
          if (response.ok && response.data && response.data.authenticated) {
            const userData = response.data.user
            
            console.log('✅ [AuthGuard] User authenticated via /me endpoint:', userData)
            
            // Get token from localStorage if DevTicket is enabled, otherwise use placeholder
            const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
            const token = isDevTicketEnabled ? getAccessToken() : 'cookie-auth'
            
            if (userData && userData.email) {
              // Update auth store with verified user data
              const user = {
                id: userData.id || userData.userId || '',
                email: userData.email || '',
                name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || '',
                organizationId: userData.organizationId || userData.tenantId,
                organizationName: userData.organizationName || userData.tenantName,
                role: userData.role || 'user'
              }
              
              login(user)
              setHasVerified(true)
              
              // If user is authenticated and on auth page, redirect to dashboard
              if (isPublicRoute) {
                console.log('🔐 [AuthGuard] Redirecting authenticated user to dashboard')
                router.push('/dashboard')
                return
              }
            }
          } else if (response.status === 401) {
            console.log('⚠️ [AuthGuard] Not authenticated (401 from /me)')
            
            // Clear auth state
            logout()
            setHasVerified(true)
            
            // Clear any stale tokens if DevTicket is enabled
            const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
            if (isDevTicketEnabled) {
              const token = getAccessToken()
              if (token) {
                console.log('🔐 [AuthGuard] Clearing stale tokens')
                localStorage.removeItem('of_access_token')
                localStorage.removeItem('of_refresh_token')
              }
            }
            
            // If trying to access protected route, redirect to auth
            if (requireAuth && !isPublicRoute) {
              console.log('🔐 [AuthGuard] Redirecting to auth - not authenticated')
              router.push('/auth')
              return
            }
          } else {
            console.log('⚠️ [AuthGuard] /me endpoint returned unexpected status:', response.status)
            logout()
            setHasVerified(true)
          }
        } catch (error) {
          console.error('❌ [AuthGuard] Failed to verify authentication:', error)
          setHasVerified(true)
          
          // On error, fall back to checking stored auth state
          if (requireAuth && !isAuthenticated && !isPublicRoute) {
            console.log('🔐 [AuthGuard] Redirecting to auth - verification failed')
            router.push('/auth')
            return
          }
        }
      }

      // After verification, perform standard auth check
      if (hasVerified) {
        if (requireAuth && !isAuthenticated && !isPublicRoute) {
          // User is not authenticated but trying to access protected route
          console.log('🔐 [AuthGuard] Redirecting to auth - not authenticated')
          router.push('/auth')
        } else if (!requireAuth && isAuthenticated && isPublicRoute) {
          // User is authenticated but trying to access auth pages
          console.log('🔐 [AuthGuard] Redirecting to dashboard - already authenticated')
          router.push('/dashboard')
        } else {
          // User can access the current route
          setIsChecking(false)
        }
      }
    }

    // Run verification and auth check
    verifyAndCheckAuth()
  }, [isAuthenticated, requireAuth, router, pathname, hasVerified, login, logout, getAccessToken])

  // Show loading while checking authentication
  if (isChecking && requireAuth) {
    return (
      <div className="min-h-screen bg-ods-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ods-text-primary"></div>
          <p className="mt-2 text-ods-text-secondary">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}