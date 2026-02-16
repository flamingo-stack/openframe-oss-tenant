'use client'

import { AppLayout } from '../../../../components/app-layout'
import ScheduleScriptView from '../../../components/schedule-script-view'
import { useParams, useRouter } from 'next/navigation'
import { featureFlags } from '@lib/feature-flags'
import { NotFoundError } from '@flamingo-stack/openframe-frontend-core'

export default function ScheduleScriptPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''

  if (!featureFlags.scriptSchedule.enabled()) {
    return (
      <AppLayout>
        <NotFoundError
          message="Script scheduling is not available. This feature is currently disabled."
          onHome={() => router.push('/scripts')}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <ScheduleScriptView scriptId={id} />
    </AppLayout>
  )
}
