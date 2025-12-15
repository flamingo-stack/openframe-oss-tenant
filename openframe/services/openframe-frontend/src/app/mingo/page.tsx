'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core'
import { MingoView } from './components/mingo-view'
import { isSaasTenantMode } from '@lib/app-mode'

export default function Mingo() {
  const router = useRouter()

  useEffect(() => {
    if (!isSaasTenantMode()) {
      router.replace('/dashboard')
      return
    }
  }, [router])

  // Don't render anything if not in saas-tenant mode
  if (!isSaasTenantMode()) {
    return null
  }

  return (
    <AppLayout>
      <ContentPageContainer padding="none" showHeader={false}>
        <MingoView />
      </ContentPageContainer>
    </AppLayout>
  )
}