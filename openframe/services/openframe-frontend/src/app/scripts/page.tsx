'use client'

import { AppLayout } from '../components/app-layout'
import { ScriptsTable } from './components/scripts-table'

export default function Scripts() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <ScriptsTable/>
      </div>
    </AppLayout>
  )
}