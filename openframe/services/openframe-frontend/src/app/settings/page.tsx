'use client'

import { AppLayout } from '../components/app-layout'

export default function Settings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-ods-text-primary">Settings</h1>
        <p className="text-ods-text-secondary">Configure your OpenFrame settings</p>
      </div>
    </AppLayout>
  )
}