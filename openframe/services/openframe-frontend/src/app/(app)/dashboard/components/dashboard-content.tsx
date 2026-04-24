'use client';

import { isSaasTenantMode } from '@/lib/app-mode';
import { ChatsOverviewSection } from './chats-overview';
import { DevicesOverviewSection } from './devices-overview';
import { OnboardingSection } from './onboarding-section';
import { OrganizationsOverviewSection } from './organizations-overview';

/**
 * Dashboard content component - extracted for dynamic import with loading skeleton
 * Contains all dashboard sections: Onboarding, Devices, Chats (SaaS only), Organizations
 */
export default function DashboardContent() {
  const showChats = isSaasTenantMode();

  return (
    <div className="space-y-10">
      <OnboardingSection />
      <DevicesOverviewSection />
      {showChats && <ChatsOverviewSection />}
      <OrganizationsOverviewSection />
    </div>
  );
}
