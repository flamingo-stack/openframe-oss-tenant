'use client'

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui'

/**
 * ScheduleInfoBarFromData skeleton — Name/Note top row + Date/Time/Repeat/Platform bottom row
 */
function InfoBarSkeleton() {
  return (
    <div className="flex flex-col gap-0 bg-ods-card border border-ods-border rounded-[6px] overflow-clip w-full">
      <div className="grid grid-cols-2 border-b border-ods-border">
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
            <Skeleton className="h-6 w-24 mb-1" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Selection mode radio options skeleton
 */
function SelectionModeSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 p-4 bg-ods-card border border-ods-border rounded-[6px]">
        <Skeleton className="h-4 w-4 mt-1 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
      </div>
      <div className="flex items-start gap-3 p-4 bg-ods-card border border-ods-border rounded-[6px] opacity-50">
        <Skeleton className="h-4 w-4 mt-1 rounded-full" />
        <div className="flex flex-col flex-1 gap-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-7 w-[100px] rounded-[4px]" />
      </div>
    </div>
  )
}

/**
 * Device table row skeleton
 */
function DeviceRowSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-ods-card border border-ods-border rounded-[6px] px-4 py-3">
      <Skeleton className="h-8 w-8 rounded-[6px]" />
      <div className="flex flex-col flex-1 gap-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-6 w-[120px] hidden sm:block" />
      <Skeleton className="h-6 w-[80px] hidden md:block" />
      <Skeleton className="h-8 w-[80px] hidden md:block rounded-md" />
      <Skeleton className="h-10 w-10 rounded-md" />
    </div>
  )
}

/**
 * Full Schedule Assign Devices page loader
 * Matches ScheduleAssignDevicesView inside DetailPageContainer:
 * - Back link + title + Save button
 * - ScheduleInfoBarFromData
 * - Selection mode radios
 * - Sub-tabs (Available / Selected)
 * - Search input
 * - Device table
 */
export function ScheduleAssignDevicesLoader() {
  return (
    <div className="min-h-screen bg-ods-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Skeleton className="h-5 w-40" />

        {/* Title + Save button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-12 w-[130px] rounded-md" />
        </div>

        {/* Info bar */}
        <InfoBarSkeleton />

        {/* Selection mode */}
        <SelectionModeSkeleton />

        {/* Sub-tabs */}
        <div className="flex gap-2 border-b border-ods-border">
          <Skeleton className="h-10 w-[160px] rounded-t-md" />
          <Skeleton className="h-10 w-[170px] rounded-t-md" />
        </div>

        {/* Search */}
        <Skeleton className="h-12 w-full rounded-md" />

        {/* Device rows */}
        <div className="flex flex-col gap-1">
          {[...Array(8)].map((_, i) => (
            <DeviceRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
