'use client'

import { apiClient } from '@/src/lib/api-client'
import { AppHeader, NavigationSidebar } from '@flamingo-stack/openframe-frontend-core/components/navigation'
import { CompactPageLoader } from '@flamingo-stack/openframe-frontend-core/components/ui'
import type { NavigationSidebarConfig } from '@flamingo-stack/openframe-frontend-core/types/navigation'
import { runtimeEnv } from '@lib/runtime-config'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDefaultRedirectPath, isAuthOnlyMode, isOssTenantMode, isSaasTenantMode, shouldShowNavigationSidebar } from '../../lib/app-mode'
import { getNavigationItems } from '../../lib/navigation-config'
import { useAuth } from '../auth/hooks/use-auth'
import { useAuthStore } from '../auth/stores/auth-store'
import { AppShellSkeleton } from './app-shell-skeleton'
import { UnauthorizedOverlay } from './unauthorized-overlay'

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

  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim()

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
          userName={displayName}
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

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const { handleAuthenticationSuccess } = useAuth()
  const handleAuthSuccessRef = useRef(handleAuthenticationSuccess)
  useEffect(() => { handleAuthSuccessRef.current = handleAuthenticationSuccess }, [handleAuthenticationSuccess])
  const router = useRouter()
  const pathname = usePathname()

  const [isHydrated, setIsHydrated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

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

  useEffect(() => {
    if (!isSaasTenantMode()) return
    if (isAuthenticated) return
    if (hasCheckedAuth || isCheckingAuth) return

    let cancelled = false
    const check = async () => {
      try {
        setIsCheckingAuth(true)
        const res = await apiClient.me()
        if (!cancelled && res.ok && (res as any).data?.authenticated) {
          const userData = (res as any).data.user
          const token = runtimeEnv.enableDevTicketObserver()
            ? (typeof window !== 'undefined' ? (localStorage.getItem('of_access_token') || 'cookie-auth') : 'cookie-auth')
            : 'cookie-auth'

          handleAuthSuccessRef.current(token, userData)
        }
      } catch (e) {
        // noop: if /me fails, we'll fall back to showing UnauthorizedOverlay
      } finally {
        if (!cancelled) {
          setIsCheckingAuth(false)
          setHasCheckedAuth(true)
        }
      }
    }

    const t = setTimeout(check, 50)
    return () => { cancelled = true; clearTimeout(t) }
  }, [isAuthenticated])

  if (isOssTenantMode() && !isHydrated) {
    return <AppShellSkeleton />
  }

  if (isAuthOnlyMode()) {
    return <>{children}</>
  }

  if (isSaasTenantMode() && !isAuthenticated) {
    if (!hasCheckedAuth || isCheckingAuth) {
      return <AppShellSkeleton />
    }
    return <UnauthorizedOverlay />
  }

  if (isOssTenantMode() && isHydrated && !isAuthenticated) {
    return <AppShellSkeleton />
  }

  return <AppShell>{children}</AppShell>
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </Suspense>
  )
}