'use client'

import { useParams } from 'next/navigation'
import { AppLayout } from '../../../components/app-layout'
import { DeviceDetailsView } from '../../components/device-details-view'

export default function DeviceDetailsPage() {
  const params = useParams<{ machineId?: string }>()
  const id = typeof params?.machineId === 'string' ? params.machineId : ''
  return (
    <AppLayout>
      <DeviceDetailsView deviceId={id} />
    </AppLayout>
  )
}
