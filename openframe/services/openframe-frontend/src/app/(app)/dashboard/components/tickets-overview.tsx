'use client';

import { DashboardInfoCard, Skeleton } from '@flamingo-stack/openframe-frontend-core';
import { useTicketsOverview } from '../hooks/use-dashboard-stats';

export function TicketsOverviewSection() {
  const tickets = useTicketsOverview();

  if (tickets.isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
          Tickets Overview
        </h2>
        <Skeleton className="h-5 w-48" />

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
      <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
        Tickets Overview
      </h2>
      <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
        {tickets.total.toLocaleString()} Tickets in Total
      </p>

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
