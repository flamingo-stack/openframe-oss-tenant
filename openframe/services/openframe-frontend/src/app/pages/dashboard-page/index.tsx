'use client'

import { OpenFrameDashboardPage } from '@app/components/openframe-dashboard/dashboard-page'
import { AuthGuard } from '@app/auth/components/auth-guard'

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth={true}>
      <OpenFrameDashboardPage />
    </AuthGuard>
  )
}