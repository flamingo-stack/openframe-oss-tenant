'use client'

export const dynamic = 'force-dynamic'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'
import { PoliciesAndQueriesView } from './components/policies-and-queries-view'

export default function PoliciesAndQueries() {
  return (
    <AppLayout>
      <ContentPageContainer padding="none">
        <PoliciesAndQueriesView />
      </ContentPageContainer>
    </AppLayout>
  )
}