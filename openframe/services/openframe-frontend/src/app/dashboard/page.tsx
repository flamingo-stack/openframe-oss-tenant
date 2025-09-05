'use client'

import { AppLayout } from '../components/app-layout'

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-ods-text-primary">Dashboard</h1>
        <p className="text-ods-text-secondary">Welcome to the OpenFrame Dashboard</p>
      </div>
    </AppLayout>
  )
}