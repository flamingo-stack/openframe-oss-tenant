'use client'

import { AppLayout } from '../components/app-layout'
import { MingoView } from './components/mingo-view'

export default function Mingo() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <MingoView />
      </div>
    </AppLayout>
  )
}