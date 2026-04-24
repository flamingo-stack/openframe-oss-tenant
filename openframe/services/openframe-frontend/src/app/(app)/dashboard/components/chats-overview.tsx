'use client';

import { DashboardInfoCard, Skeleton } from '@flamingo-stack/openframe-frontend-core';
import { useDialogVersion } from '@/app/(app)/tickets/hooks/use-dialog-version';
import { useChatsOverview } from '../hooks/use-dashboard-stats';

export function ChatsOverviewSection() {
  const chats = useChatsOverview();
  const version = useDialogVersion();
  const openStatus = version === 'v2' ? 'TECH_REQUIRED' : 'ACTION_REQUIRED';

  if (chats.isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
          Chats Overview
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
        Chats Overview
      </h2>
      <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
        {chats.total.toLocaleString()} Chats in Total
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardInfoCard
          title="Active Chats"
          value={chats.active}
          percentage={chats.activePercentage}
          showProgress
          href={`/tickets?status=ACTIVE&status=${openStatus}&status=ON_HOLD`}
        />
        <DashboardInfoCard
          title="Resolved Chats"
          value={chats.resolved}
          percentage={chats.resolvedPercentage}
          showProgress
          href="/tickets?status=RESOLVED"
        />
        <DashboardInfoCard title="Avg. Resolve Time" value={chats.avgResolveTime} />
        <DashboardInfoCard title="Avg. Fae Rate" value={`${chats.avgFaeRate}/5`} />
      </div>
    </div>
  );
}

export default ChatsOverviewSection;
