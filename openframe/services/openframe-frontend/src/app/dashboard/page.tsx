'use client'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'
import { isSaasTenantMode } from '@lib/app-mode'
import { OnboardingSection } from './components/onboarding-section'
import { DevicesOverviewSection } from './components/devices-overview'
import { OrganizationsOverviewSection } from './components/organizations-overview'
import { ChatsOverviewSection } from './components/chats-overview'

export default function Dashboard() {
  const showChats = isSaasTenantMode()

  return (
    <AppLayout>
      <ContentPageContainer
        showHeader={false}
        padding="none"
      >
        <div className="space-y-10 pt-6">
          {/* Onboarding walkthrough - dismissible with local storage */}
          <OnboardingSection />

          <DevicesOverviewSection />

          {showChats && (
            <ChatsOverviewSection />
          )}

          <OrganizationsOverviewSection />
        </div>
      </ContentPageContainer>
    </AppLayout>
  )
}