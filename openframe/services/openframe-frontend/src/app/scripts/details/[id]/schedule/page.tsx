'use client'

import { AppLayout } from '../../../../components/app-layout'
import ScheduleScriptView from '../../../components/schedule-script-view'
import { useParams } from 'next/navigation'

export default function ScheduleScriptPage() {
  const params = useParams<{ id?: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  return (
    <AppLayout>
      <ScheduleScriptView scriptId={id} />
    </AppLayout>
  )
}
