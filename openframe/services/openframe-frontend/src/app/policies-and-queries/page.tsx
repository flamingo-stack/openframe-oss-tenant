'use client'

import { AppLayout } from '../components/app-layout'
import { PoliciesAndQueriesView } from './components/policies-and-queries-view'

export default function PoliciesAndQueries() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <PoliciesAndQueriesView />
      </div>
    </AppLayout>
  )
}