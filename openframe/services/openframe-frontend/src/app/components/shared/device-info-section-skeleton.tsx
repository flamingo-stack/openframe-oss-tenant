'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * Skeleton matching the inline `DeviceCard` rendered by `DeviceInfoSection`:
 * - p-4 card with `flex flex-col gap-4`
 * - Row 1: 32x32 icon box | (16px OS icon + name) over org | Details button
 * - Row 2: status tag + "Last Seen: ..." text
 */
export function DeviceInfoSectionSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] flex flex-col gap-4 p-4 w-full overflow-clip min-h-[130px] justify-center">
      <div className="flex gap-4 items-center w-full">
        <div className="flex items-center justify-center p-2 rounded-[6px] border border-ods-border shrink-0">
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex gap-1 items-center">
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-12 w-[88px] rounded-[6px] shrink-0" />
      </div>
      <div className="flex gap-2 items-center w-full">
        <Skeleton className="h-6 w-16 rounded-[4px] shrink-0" />
        <Skeleton className="h-5 w-48 max-w-full" />
      </div>
    </div>
  );
}
