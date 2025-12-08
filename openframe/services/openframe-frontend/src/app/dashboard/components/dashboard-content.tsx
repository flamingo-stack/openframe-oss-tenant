'use client'

import { OnboardingSection } from './onboarding-section'
import { DevicesOverviewSection } from './devices-overview'
import { ChatsOverviewSection } from './chats-overview'
import { OrganizationsOverviewSection } from './organizations-overview'
import { isSaasTenantMode } from '@lib/app-mode'

/**
 * Dashboard content component - extracted for dynamic import with loading skeleton
 * Contains all dashboard sections: Onboarding, Devices, Chats (SaaS only), Organizations
 */
export default function DashboardContent() {
  const showChats = isSaasTenantMode()

  return (
    <div className="space-y-10 pt-6">
      <OnboardingSection />
      <DevicesOverviewSection />
      {showChats && <ChatsOverviewSection />}
      <OrganizationsOverviewSection />
    </div>
  )
}
