'use client'

import dynamic from 'next/dynamic'

const DashboardPage = dynamic(
  () => import('@app/pages/dashboard-page'),
  { ssr: false }
)

export default function Dashboard() {
  return <DashboardPage />
}