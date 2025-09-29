'use client'

import { useCallback, useMemo, Suspense, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { NavigationSidebar } from '@flamingo/ui-kit/components/navigation'
import type { NavigationSidebarConfig } from '@flamingo/ui-kit/types/navigation'
import { useAuthStore } from '../auth/stores/auth-store'
import { useAuth } from '../auth/hooks/use-auth'
import { getNavigationItems } from '../../lib/navigation-config'
import { shouldShowNavigationSidebar, isAuthOnlyMode, getDefaultRedirectPath, isSaasTenantMode, isOssTenantMode } from '../../lib/app-mode'
import { UnauthorizedOverlay } from './unauthorized-overlay'
import { ListLoader } from '@flamingo/ui-kit/components/ui'

// Loading component for content area
function ContentLoading() {
  return <ListLoader />
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()

  // Memoize navigation handler to prevent recreating on every render
  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  // Memoize logout handler to prevent recreating on every render
  const handleLogout = useCallback(async () => {
    await logout()
    router.push(getDefaultRedirectPath(false))
  }, [logout, router])

  // Memoize navigation items to only update when pathname or handleLogout changes
  const navigationItems = useMemo(
    () => getNavigationItems(pathname, handleLogout),
    [pathname, handleLogout]
  )

  // Memoize sidebar config to prevent recreating on every render
  const sidebarConfig: NavigationSidebarConfig = useMemo(
    () => ({
      items: navigationItems,
      onNavigate: handleNavigate,
      className: 'h-screen'
    }),
    [navigationItems, handleNavigate]
  )

  return (
    <div className="flex h-screen bg-ods-bg">
      {/* Navigation Sidebar - Only show if navigation should be visible */}
      {shouldShowNavigationSidebar() && (
        <NavigationSidebar config={sidebarConfig} />
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<ContentLoading />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  // Top-level effect to handle redirect in oss-tenant for unauthenticated users
  useEffect(() => {
    if (isOssTenantMode() && !isAuthenticated && !pathname?.startsWith('/auth')) {
      router.push('/auth')
    }
  }, [isAuthenticated, pathname, router])

  // In auth-only mode, don't render the app layout
  if (isAuthOnlyMode()) {
    return <>{children}</>
  }

  // In saas-tenant (app-only) mode and unauthenticated, show overlay instead of initializing auth hook
  if (isSaasTenantMode() && !isAuthenticated) {
    return <UnauthorizedOverlay />
  }

  // In oss-tenant mode and unauthenticated, show a lightweight loader to avoid flicker
  if (isOssTenantMode() && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ListLoader />
      </div>
    )
  }

  // Otherwise, render the full app shell (which uses auth hook internally)
  return <AppShell>{children}</AppShell>
}