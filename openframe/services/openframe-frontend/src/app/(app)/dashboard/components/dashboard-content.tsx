'use client';

import { isSaasTenantMode } from '@/lib/app-mode';
import { CustomersOverviewSection } from './customers-overview';
import { DevicesOverviewSection } from './devices-overview';
import { OnboardingSection } from './onboarding-section';
import { TicketsOverviewSection } from './tickets-overview';

/**
 * Dashboard content component - extracted for dynamic import with loading skeleton
 * Contains all dashboard sections: Onboarding, Devices, Tickets (SaaS only), Organizations
 */
export default function DashboardContent() {
  const showTickets = isSaasTenantMode();

  return (
    <div className="space-y-10 p-[var(--spacing-system-l)]">
      <OnboardingSection />
      <DevicesOverviewSection />
      {showTickets && <TicketsOverviewSection />}
      <CustomersOverviewSection />
    </div>
  );
}
