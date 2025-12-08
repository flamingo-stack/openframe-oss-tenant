'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@app/auth/stores/auth-store'
import { getDefaultRedirectPath, isAuthOnlyMode } from '../lib/app-mode'
import { AppShellSkeleton } from './components/app-shell-skeleton'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthOnlyMode()) {
      router.push('/auth')
    } else {
      const redirectPath = getDefaultRedirectPath(isAuthenticated)
      router.push(redirectPath)
    }
  }, [router, isAuthenticated])

  return <AppShellSkeleton />
}