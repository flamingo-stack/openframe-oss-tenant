'use client'

import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { ScheduleDetailView } from '../../components/schedule-detail-view'

export const dynamic = 'force-dynamic'

export default function ScheduleDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''

  return (
    <AppLayout>
      <ScheduleDetailView scheduleId={id} />
    </AppLayout>
  )
}
