'use client'

import { AuthGuard } from '@/app/_components/auth-guard'
import { OpenFrameDevicesPage } from '@/app/_components/openframe-dashboard/devices-page'

export default function DevicesPage() {
  return (
    <AuthGuard>
      <OpenFrameDevicesPage />
    </AuthGuard>
  )
}