'use client'

import { AuthGuard } from '@/app/_components/auth-guard'
import { OpenFrameDashboardPage } from '@/app/_components/openframe-dashboard/dashboard-page'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <OpenFrameDashboardPage />
    </AuthGuard>
  )
}