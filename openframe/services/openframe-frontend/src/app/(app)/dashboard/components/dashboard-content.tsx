'use client';

import { isSaasTenantMode } from '@/lib/app-mode';
import { ChatsOverviewSection } from './chats-overview';
import { CustomersOverviewSection } from './customers-overview';
import { DevicesOverviewSection } from './devices-overview';
import { OnboardingSection } from './onboarding-section';

/**
 * Dashboard content component - extracted for dynamic import with loading skeleton
 * Contains all dashboard sections: Onboarding, Devices, Chats (SaaS only), Organizations
 */
export default function DashboardContent() {
  const showChats = isSaasTenantMode();

  return (
    <div className="space-y-10 p-[var(--spacing-system-l)]">
      <OnboardingSection />
      <DevicesOverviewSection />
      {showChats && <ChatsOverviewSection />}
      <CustomersOverviewSection />
    </div>
  );
}
