'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@app/auth/stores/auth-store'
import { ContentPageContainer } from '@flamingo/ui-kit/components/ui'
import { getDefaultRedirectPath, isAuthOnlyMode } from '../lib/app-mode'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    if (isAuthOnlyMode()) {
      if (isAuthenticated) {
        router.push('/auth/already-signed-in')
      } else {
        router.push('/auth')
      }
    } else {
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