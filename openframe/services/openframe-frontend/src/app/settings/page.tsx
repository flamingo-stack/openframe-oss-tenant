'use client'

import dynamic from 'next/dynamic'

const SettingsPage = dynamic(
  () => import('@app/components/openframe-dashboard/settings-page'),
  { ssr: false }
)

export default function Settings() {
  return <SettingsPage />
}