'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * ScheduleInfoBar skeleton — 4 cols: Date, Time, Repeat, Platform
 */
function InfoBarSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 bg-ods-card border border-ods-border rounded-[6px] overflow-clip w-full">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
          <Skeleton className="h-6 w-24 mb-1" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Tab navigation skeleton — 3 tabs (Scripts, Devices, History)
 */
function TabsSkeleton() {
  return (
    <div className="flex gap-2 border-b border-ods-border">
      <Skeleton className="h-10 w-[160px] rounded-t-md" />
      <Skeleton className="h-10 w-[160px] rounded-t-md" />
      <Skeleton className="h-10 w-[170px] rounded-t-md" />
    </div>
  );
}

/**
 * Table row skeleton for tab content
 */
function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-ods-card border border-ods-border rounded-[6px] px-4 py-3">
      <Skeleton className="h-6 flex-1" />
      <Skeleton className="h-6 w-[120px] hidden sm:block" />
      <Skeleton className="h-6 w-[100px] hidden md:block" />
    </div>
  );
}

/**
 * Full Schedule Detail page loader
 * Matches ScheduleDetailView inside DetailPageContainer:
 * - Back link + title + edit icon
 * - ScheduleInfoBar
 * - TabNavigation (3 tabs)
 * - Tab content (table)
 */
export function ScheduleDetailLoader() {
  return (
    <div className="min-h-screen bg-ods-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Skeleton className="h-5 w-48" />

        {/* Title + edit button */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-12 w-12 rounded-md" />
        </div>

        {/* Info bar */}
        <InfoBarSkeleton />

        {/* Tabs */}
        <TabsSkeleton />

        {/* Tab content — table rows */}
        <div className="flex flex-col gap-1 pt-2">
          {[...Array(5)].map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
