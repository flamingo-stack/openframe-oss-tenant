'use client';

import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * ScheduleInfoBar skeleton — 4 cols: Date, Time, Repeat, Platform
 */
function InfoBarSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 bg-ods-card border border-ods-border rounded-[6px] overflow-clip w-full">
      {/* Date */}
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px] border-b md:border-b-0 border-ods-border">
        <Skeleton className="h-[24px] w-28 mb-1" />
        <Skeleton className="h-[20px] w-10" />
      </div>
      {/* Time */}
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px] border-b md:border-b-0 border-ods-border">
        <Skeleton className="h-[24px] w-24 mb-1" />
        <Skeleton className="h-[20px] w-10" />
      </div>
      {/* Repeat */}
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
        <Skeleton className="h-[24px] w-14 mb-1" />
        <Skeleton className="h-[20px] w-14" />
      </div>
      {/* Supported Platform */}
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
        <Skeleton className="h-5 w-5 mb-1" />
        <Skeleton className="h-[20px] w-32" />
      </div>
    </div>
  );
}

/**
 * Tab navigation skeleton — 3 tabs (Scripts, Devices, History) with icons
 */
function TabsSkeleton() {
  return (
    <div className="flex gap-2 border-b border-ods-border">
      <Skeleton className="h-10 w-[180px] rounded-t-md" />
      <Skeleton className="h-10 w-[170px] rounded-t-md" />
      <Skeleton className="h-10 w-[180px] rounded-t-md" />
    </div>
  );
}

/**
 * Script card skeleton — matches ScheduleScriptCard layout
 */
function ScriptCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-clip flex flex-col">
      <div className="flex gap-4 items-center h-[80px] px-4">
        {/* Script name + label */}
        <div className="flex-1 flex flex-col min-w-0">
          <Skeleton className="h-[24px] w-44 mb-1" />
          <Skeleton className="h-[20px] w-12" />
        </div>

        {/* Timeout */}
        <div className="flex flex-col">
          <Skeleton className="h-[24px] w-24 mb-1" />
          <Skeleton className="h-[20px] w-16" />
        </div>

        {/* Script Details button */}
        <Skeleton className="h-10 w-[120px] rounded-[6px] hidden md:block" />

        {/* Chevron button */}
        <Skeleton className="h-10 w-10 rounded-[6px]" />
      </div>
    </div>
  );
}

/**
 * Full Schedule Detail page skeleton
 * Matches ScheduleDetailView inside DetailPageContainer:
 * - Back link + title + 2 action buttons
 * - ScheduleInfoBar (4 columns)
 * - TabNavigation (3 tabs with icons)
 * - Tab content (script card)
 */
export function ScheduleDetailSkeleton() {
  return (
    <DetailPageContainer
      headerContent={
        <div className="flex items-end justify-between md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between gap-4 w-full pt-8">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-64 sm:h-10 sm:w-72" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-12 w-[155px] rounded-[6px]" />
            <Skeleton className="h-12 w-[160px] rounded-[6px]" />
          </div>
        </div>
      }
      padding="none"
    >
      <div className="flex-1 overflow-auto">
        {/* Info bar */}
        <div className="pt-6">
          <InfoBarSkeleton />
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <TabsSkeleton />

          {/* Tab content — script card */}
          <div className="pt-6 flex flex-col gap-6">
            <ScriptCardSkeleton />
          </div>
        </div>
      </div>
    </DetailPageContainer>
  );
}
