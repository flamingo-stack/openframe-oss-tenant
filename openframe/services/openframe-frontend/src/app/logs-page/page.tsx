'use client'

import { AppLayout } from '../components/app-layout'
import { LogsTable } from './components/logs-table'

export default function Logs() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-ods-text-primary">Logs</h1>
        <p className="text-ods-text-secondary">Monitor system logs</p>
        <LogsTable/>
      </div>
    </AppLayout>
  )
}