'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { Suspense } from 'react';
import { InitialSetupCard } from '@/app/(app)/onboarding/components/initial-setup-card';
import { isSaasTenantMode } from '@/lib/app-mode';
import { featureFlags } from '@/lib/feature-flags';
import { useOnboardingStore } from '@/stores/onboarding-store';
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

  // Dim (and disable) the rest of the dashboard ONLY while the tenant Initial Setup
  // is still incomplete — that's when the setup card is the surface to focus on
  // ("finish setup first"). Once setup is complete — or before onboarding progress
  // has loaded — the dashboard is fully lit. Backed by the same onboarding store as
  // the setup card, so it flips the instant setup is marked complete.
  const onboardingLoaded = useOnboardingStore(state => state.isLoaded);
  const initialSetupComplete = useOnboardingStore(state => state.tenant?.completed ?? false);
  const dimDashboard = newOnboardingEnabled && onboardingLoaded && !initialSetupComplete;

  return (
    <div className="space-y-10 p-[var(--spacing-system-l)]">
      {showLegacyOnboarding && <OnboardingSection />}
      {/* Local Suspense so the setup card's suspending queries (e.g. DeviceSetupStep's
          `useDeviceOrganizations`, a `useSuspenseQuery`) are caught here instead of
          bubbling to the route-level `loading.tsx` and re-flashing the whole dashboard
          skeleton. `fallback={null}` — the card just appears when ready, no skeleton. */}
      {newOnboardingEnabled && (
        <Suspense fallback={null}>
          <InitialSetupCard />
        </Suspense>
      )}
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
