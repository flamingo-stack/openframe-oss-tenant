'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from './auth/stores/auth-store'
import { getDefaultRedirectPath } from '../lib/app-mode'
import { AppShellSkeleton } from './components/app-shell-skeleton'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated !== null) {
      const redirectPath = getDefaultRedirectPath(isAuthenticated)
      router.push(redirectPath)
    }
  }, [router, isAuthenticated])

  return <AppShellSkeleton />
}