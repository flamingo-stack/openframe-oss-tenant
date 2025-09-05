'use client'

import { AppLayout } from '../components/app-layout'
import { LogsTable } from './components/logs-table'

export default function Logs() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <LogsTable/>
      </div>
    </AppLayout>
  )
}