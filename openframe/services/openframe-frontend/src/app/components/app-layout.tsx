'use client'

import { useCallback, useMemo, Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { NavigationSidebar } from '@flamingo/ui-kit/components/navigation'
import { AppHeader } from '@flamingo/ui-kit/components/navigation'
import type { NavigationSidebarConfig } from '@flamingo/ui-kit/types/navigation'
import { useAuthStore } from '../auth/stores/auth-store'
import { useAuth } from '../auth/hooks/use-auth'
import { getNavigationItems } from '../../lib/navigation-config'
import { shouldShowNavigationSidebar, isAuthOnlyMode, getDefaultRedirectPath, isSaasTenantMode, isOssTenantMode } from '../../lib/app-mode'
import { UnauthorizedOverlay } from './unauthorized-overlay'
import { PageLoader, CompactPageLoader } from '@flamingo/ui-kit/components/ui'

function ContentLoading() {
  return <CompactPageLoader />
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()
  const user = useAuthStore(state => state.user)

  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push(getDefaultRedirectPath(false))
  }, [logout, router])

  const navigationItems = useMemo(
    () => getNavigationItems(pathname, handleLogout),
    [pathname, handleLogout]
  )

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
        {/* App Header */}
        <AppHeader
          showNotifications
          showUser
          userName={user?.name}
          userEmail={user?.email}
          onProfile={() => router.push('/settings/?tab=profile')}
          onLogout={logout}
        />
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 pt-0">
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

  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const checkHydration = () => {
      const store = useAuthStore as any
      const persistState = store.persist?.hasHydrated?.()
      if (persistState !== undefined) {
        setIsHydrated(persistState)
      } else {
        setTimeout(() => setIsHydrated(true), 100)
      }
    }
    
    checkHydration()

    const store = useAuthStore as any
    const unsubscribe = store.persist?.onFinishHydration?.(() => {
      setIsHydrated(true)
    })
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (isHydrated && isOssTenantMode() && !isAuthenticated && !pathname?.startsWith('/auth')) {
      router.push('/auth')
    }
  }, [isHydrated, isAuthenticated, pathname, router])

  if (isOssTenantMode() && !isHydrated) {
    return <PageLoader title="Initializing" description="Loading application..." />
  }

  if (isAuthOnlyMode()) {
    return <>{children}</>
  }

  if (isSaasTenantMode() && !isAuthenticated) {
    return <UnauthorizedOverlay />
  }

  if (isOssTenantMode() && isHydrated && !isAuthenticated) {
    return <PageLoader />
  }

  return <AppShell>{children}</AppShell>
}