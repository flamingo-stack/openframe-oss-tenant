'use client';

import { isSaasTenantMode } from '@/lib/app-mode';
import {
  CustomersOverviewSkeleton,
  DevicesOverviewSkeleton,
  TicketsOverviewSkeleton,
} from './components/dashboard-skeletons';

/**
 * Next.js route-level loading state for /dashboard.
 *
 * Renders the exact same section skeletons the overview sections render while they
 * fetch (`./components/dashboard-skeletons`), so the transition route-skeleton →
 * section-skeleton → data has no shape change. The onboarding block is deliberately
 * NOT skeletoned — it renders nothing until its progress loads (see `InitialSetupCard`).
 */
export default function DashboardLoading() {
  const showTickets = isSaasTenantMode();

  return (
    <div className="space-y-10 p-[var(--spacing-system-l)]" role="status" aria-label="Loading dashboard">
      <DevicesOverviewSkeleton />
      {showTickets && <TicketsOverviewSkeleton />}
      <CustomersOverviewSkeleton />
    </div>
  );
}
