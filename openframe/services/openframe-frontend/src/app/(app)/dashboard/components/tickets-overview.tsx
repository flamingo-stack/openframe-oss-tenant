'use client';

import { DashboardInfoCard, Skeleton } from '@flamingo-stack/openframe-frontend-core';
import { useTicketsOverview } from '../hooks/use-dashboard-stats';

export function TicketsOverviewSection() {
  const tickets = useTicketsOverview();

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
      </div>
    </div>
  );
}

export default TicketsOverviewSection;
