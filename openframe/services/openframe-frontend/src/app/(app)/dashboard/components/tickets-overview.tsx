'use client';

import { DashboardInfoCard, TicketStatusTag, TitleBlock } from '@flamingo-stack/openframe-frontend-core';
import { routes } from '@/lib/routes';
import { useTicketsOverview } from '../hooks/use-dashboard-stats';
import { TicketsOverviewSkeleton } from './dashboard-skeletons';

export function TicketsOverviewSection() {
  const tickets = useTicketsOverview();

  if (tickets.isLoading) {
    return <TicketsOverviewSkeleton />;
  }

  return (
    <div className="space-y-4">
      <TitleBlock
        title="Tickets Overview"
        subtitle={`${tickets.total.toLocaleString()} Tickets in Total`}
        className="pt-0 mb-0 [&_p]:hidden lg:[&_p]:block"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardInfoCard
          titleSlot={<TicketStatusTag status="AI_ASSISTANCE" />}
          value={tickets.aiAssistance}
          href={routes.tickets.list}
        />
        <DashboardInfoCard
          titleSlot={<TicketStatusTag status="TECH_REQUIRED" color={tickets.techRequiredColor} />}
          value={tickets.techRequired}
          href={routes.tickets.list}
        />
        <DashboardInfoCard
          titleSlot={<TicketStatusTag status="RESOLVED" />}
          value={tickets.resolved}
          href={routes.tickets.list}
        />
        <DashboardInfoCard
          titleSlot={
            <span className="text-h5 uppercase text-ods-text-secondary flex items-center h-8">Other Statuses</span>
          }
          value={tickets.otherStatuses}
          href={routes.tickets.list}
        />
      </div>
    </div>
  );
}

export default TicketsOverviewSection;
