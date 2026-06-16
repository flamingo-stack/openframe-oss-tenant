'use client';

import { DashboardInfoCard, Skeleton, TicketStatusTag } from '@flamingo-stack/openframe-frontend-core';
import { featureFlags } from '@/lib/feature-flags';
import { useTicketsOverview } from '../hooks/use-dashboard-stats';

export function TicketsOverviewSection() {
  const tickets = useTicketsOverview();
  const lifecycleEnabled = featureFlags.ticketStatuses.enabled();

  if (tickets.isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-h2 text-ods-text-primary">Tickets Overview</h2>
          <Skeleton className="h-5 w-48" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-h2 text-ods-text-primary">Tickets Overview</h2>
        <p className="text-h6 text-ods-text-secondary">{tickets.total.toLocaleString()} Tickets in Total</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {lifecycleEnabled ? (
          <>
            <DashboardInfoCard
              titleSlot={<TicketStatusTag status="AI_ASSISTANCE" />}
              value={tickets.aiAssistance}
              href="/tickets"
            />
            <DashboardInfoCard
              titleSlot={<TicketStatusTag status="TECH_REQUIRED" color={tickets.techRequiredColor} />}
              value={tickets.techRequired}
              href="/tickets"
            />
            <DashboardInfoCard
              titleSlot={<TicketStatusTag status="RESOLVED" />}
              value={tickets.resolved}
              href="/tickets"
            />
            <DashboardInfoCard
              titleSlot={
                <span className="text-h5 uppercase text-ods-text-secondary flex items-center h-8">Other Statuses</span>
              }
              value={tickets.otherStatuses}
              href="/tickets"
            />
          </>
        ) : (
          <>
            <DashboardInfoCard
              title="Active Tickets"
              value={tickets.active}
              percentage={tickets.activePercentage}
              showProgress
              href="/tickets?status=ACTIVE&status=TECH_REQUIRED&status=ON_HOLD"
            />
            <DashboardInfoCard
              title="Resolved Tickets"
              value={tickets.resolved}
              percentage={tickets.resolvedPercentage}
              showProgress
              href="/tickets?status=RESOLVED"
            />
            <DashboardInfoCard title="Avg. Resolve Time" value={tickets.avgResolveTime} />
            <DashboardInfoCard title="Avg. Fae Rate" value={`${tickets.avgFaeRate}/5`} />
          </>
        )}
      </div>
    </div>
  );
}

export default TicketsOverviewSection;
