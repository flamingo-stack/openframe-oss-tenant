'use client'

export const dynamic = 'force-dynamic'

import { AppLayout } from '../components/app-layout'
import { ScriptsView } from './components/scripts-view'

export default function Scripts() {
  return (
    <AppLayout>
      <ScriptsView />
    </AppLayout>
  )
}