'use client'

import { AppLayout } from '../components/app-layout'

export default function Devices() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-ods-text-primary">Devices</h1>
        <p className="text-ods-text-secondary">Manage and monitor your devices</p>
      </div>
    </AppLayout>
  )
}