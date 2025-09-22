'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageContainer } from '@flamingo/ui-kit/components/ui'
import { useAuthStore } from './auth/stores/auth-store'
import { getDefaultRedirectPath } from '../lib/app-mode'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated !== null) {
      const redirectPath = getDefaultRedirectPath(isAuthenticated)
      router.push(redirectPath)
    }
  }, [router, isAuthenticated])

  return (
    <ContentPageContainer
      title="Welcome"
      subtitle="Loading your dashboard..."
    >
      <div />
    </ContentPageContainer>
  )
}