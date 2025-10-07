'use client'

export const dynamic = 'force-dynamic'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'
import { SettingsView } from './components/settings-view'

export default function Settings() {
  return (
    <AppLayout>
      <ContentPageContainer padding='none' showHeader={false}>
        <SettingsView />
      </ContentPageContainer>
    </AppLayout>
  )
}