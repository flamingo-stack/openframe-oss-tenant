'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isRouteAllowedInCurrentMode, isAuthOnlyMode } from '../lib/app-mode'

interface RouteGuardProps {
  children: React.ReactNode
}

/**
 * Route guard component that handles route protection for static export
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isRouteAllowedInCurrentMode(pathname)) {
      router.push('/auth')
    }
  }, [router, pathname])

  if (!isRouteAllowedInCurrentMode(pathname)) {
    return (
      <div className="min-h-screen bg-ods-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ods-text-primary mb-4">
            Redirecting...
          </h1>
          <p className="text-ods-text-secondary">
            You don't have access to this page in the current mode.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
