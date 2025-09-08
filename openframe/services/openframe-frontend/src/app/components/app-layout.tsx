'use client'

import { useCallback, useMemo, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { NavigationSidebar } from '@flamingo/ui-kit/components/navigation'
import type { NavigationSidebarConfig } from '@flamingo/ui-kit/types/navigation'
import { useAuthStore } from '../auth/stores/auth-store'
import { useAuth } from '../auth/hooks/use-auth'
import { getNavigationItems } from '../../lib/navigation-config'

// Loading component for content area
function ContentLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ods-border border-t-ods-accent" />
        <div className="text-sm text-ods-text-secondary">Loading...</div>
      </div>
    </div>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()
  const { logout } = useAuth()

  // Memoize navigation handler to prevent recreating on every render
  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  // Memoize logout handler to prevent recreating on every render
  const handleLogout = useCallback(() => {
    logout()
    router.push('/auth')
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

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-ods-bg">
      {/* Navigation Sidebar - Always visible once mounted */}
      <NavigationSidebar config={sidebarConfig} />
      
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