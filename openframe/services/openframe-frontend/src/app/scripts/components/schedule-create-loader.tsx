'use client'

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui'

/**
 * Schedule Name input skeleton
 */
function NameFieldSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  )
}

/**
 * Date picker + Repeat checkbox row skeleton
 */
function DateRepeatSkeleton() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Skeleton className="h-12 w-[220px] rounded-md" />
      <Skeleton className="h-14 w-[220px] rounded-md" />
    </div>
  )
}

/**
 * Supported Platforms row skeleton (3 platform buttons)
 */
function PlatformsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-36" />
      <div className="flex gap-3 max-w-[920px]">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-[140px] rounded-md" />
        ))}
      </div>
    </div>
  )
}

/**
 * ScheduleActionFormCard skeleton
 */
function ActionCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-12 w-full rounded-md" />
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-12 w-[200px] rounded-md" />
        <Skeleton className="h-12 flex-1 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Full Schedule Create/Edit page loader
 * Matches the exact layout of ScheduleCreateView inside DetailPageContainer
 */
export function ScheduleCreateLoader() {
  return (
    <div className="min-h-screen bg-ods-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Skeleton className="h-5 w-48" />

        {/* Title + Save button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-12 w-[140px] rounded-md" />
        </div>

        {/* Schedule Name */}
        <NameFieldSkeleton />

        {/* Date + Repeat */}
        <DateRepeatSkeleton />

        {/* Supported Platforms */}
        <PlatformsSkeleton />

        {/* Scheduled Scripts heading */}
        <Skeleton className="h-10 w-56" />

        {/* Action form card */}
        <ActionCardSkeleton />

        {/* Add Script button */}
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  )
}
