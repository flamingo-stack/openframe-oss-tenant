'use client'

import { AuthGuard } from '@/app/_components/auth-guard'
import { OpenFrameSettingsPage } from '@/app/_components/openframe-dashboard/settings-page'

export default function SettingsPage() {
  return (
    <AuthGuard>
      <OpenFrameSettingsPage />
    </AuthGuard>
  )
}