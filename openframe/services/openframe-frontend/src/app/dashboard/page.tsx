'use client'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'
import { isSaasTenantMode } from '../../lib/app-mode'
import { DevicesOverviewSection } from './components/devices-overview'
import { ChatsOverviewSection } from './components/chats-overview'
import { LogsOverviewSection } from './components/logs-overview'

export default function Dashboard() {
  const showChats = isSaasTenantMode()

  return (
    <AppLayout>
      <ContentPageContainer
        showHeader={false}
        padding="none"
      >
        <div className="space-y-10 pt-6">
          <DevicesOverviewSection />

          {showChats && (
            <ChatsOverviewSection />
          )}

          <LogsOverviewSection />
        </div>
      </ContentPageContainer>
    </AppLayout>
  )
}