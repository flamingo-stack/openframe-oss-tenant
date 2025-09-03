'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { NavigationSidebar } from '@flamingo/ui-kit/components/navigation'
import type { NavigationSidebarConfig } from '@flamingo/ui-kit/types/navigation'
import { useAuthStore } from '../auth/stores/auth-store'
import { getNavigationItems } from '../../lib/navigation-config'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, logout } = useAuthStore()

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth')
    }
  }, [isAuthenticated, router])

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const handleLogout = () => {
    logout()
    // Clear tokens if DevTicket is enabled
    const isDevTicketEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER === 'true'
    if (isDevTicketEnabled) {
      localStorage.removeItem('of_access_token')
      localStorage.removeItem('of_refresh_token')
    }
    router.push('/auth')
  }

  const navigationItems = getNavigationItems(pathname, handleLogout)

  const sidebarConfig: NavigationSidebarConfig = {
    items: navigationItems,
    onNavigate: handleNavigate,
    className: 'h-screen'
  }

  return (
    <div className="flex h-screen bg-ods-bg">
      {/* Navigation Sidebar */}
      <NavigationSidebar config={sidebarConfig} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}