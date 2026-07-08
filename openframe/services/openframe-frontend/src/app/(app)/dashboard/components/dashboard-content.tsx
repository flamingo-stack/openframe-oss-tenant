'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { InitialSetupCard } from '@/app/(app)/onboarding/components/initial-setup-card';
import { isSaasTenantMode } from '@/lib/app-mode';
import { featureFlags } from '@/lib/feature-flags';
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
  // The legacy onboarding section is replaced by the new onboarding chrome once the
  // `new-onboarding` flag is on: the tenant "Initial Setup" card here, plus the
  // standalone `/onboarding` (user Get Started) page and the top bar.
  const newOnboardingEnabled = featureFlags.newOnboarding.enabled();
  const showLegacyOnboarding = !newOnboardingEnabled;

  // While the Initial Setup card is shown, the rest of the dashboard is dimmed and
  // non-interactive — the setup card is the only lit surface, so it reads as
  // "finish setup first" (per design). Static: tied to the flag.
  const dimDashboard = newOnboardingEnabled;

  return (
    <div className="space-y-10 p-[var(--spacing-system-l)]">
      {showLegacyOnboarding && <OnboardingSection />}
      {newOnboardingEnabled && <InitialSetupCard />}
      <div
        className={cn(
          'space-y-10 transition-opacity duration-300',
          dimDashboard && 'pointer-events-none select-none opacity-40',
        )}
        aria-hidden={dimDashboard || undefined}
      >
        <DevicesOverviewSection />
        {showTickets && <TicketsOverviewSection />}
        <CustomersOverviewSection />
      </div>
    </div>
  );
}
