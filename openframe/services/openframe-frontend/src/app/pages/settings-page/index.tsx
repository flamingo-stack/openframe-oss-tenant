'use client'

import { OpenFrameSettingsPage } from '@app/components/openframe-dashboard/settings-page'
import { AuthGuard } from '@app/auth/components/auth-guard'

export default function SettingsPage() {
  return (
    <AuthGuard requireAuth={true}>
      <OpenFrameSettingsPage />
    </AuthGuard>
  )
}