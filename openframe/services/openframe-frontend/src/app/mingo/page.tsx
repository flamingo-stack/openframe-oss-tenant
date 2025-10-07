'use client'

export const dynamic = 'force-dynamic'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'
import { MingoView } from './components/mingo-view'

export default function Mingo() {
  return (
    <AppLayout>
      <ContentPageContainer padding="none" showHeader={false}>
        <MingoView />
      </ContentPageContainer>
    </AppLayout>
  )
}