'use client'

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui'

/**
 * Script Info Section skeleton
 * Matches ScriptInfoSection: headline, description, shell/platforms/category row with avatar
 */
function ScriptInfoSectionSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 space-y-3">
      {/* Headline + Description */}
      <Skeleton className="h-6 w-48 max-w-full" />
      <Skeleton className="h-4 w-full" />

      {/* Shell Type | Supported Platforms | Category | Added by */}
      {/* Mobile: 2x2 grid, Desktop: flex row */}
      <div className="grid grid-cols-2 gap-3 pt-2 md:flex md:items-center md:gap-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-5 w-24 md:w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-16 md:w-20" />
            <Skeleton className="h-3 w-12 md:w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Script Arguments section skeleton
 * Matches ScriptArguments: title + key/value rows + add button
 */
function ScriptArgumentsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      {/* 3 argument rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-[6px]" />
          <Skeleton className="h-12 flex-1 rounded-[6px]" />
          <Skeleton className="h-12 w-10 md:w-12 rounded-[6px]" />
        </div>
      ))}
      <Skeleton className="h-5 w-36" />
    </div>
  )
}

/**
 * Device card skeleton
 */
function DeviceCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 flex items-center gap-3">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-8 w-8 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/**
 * Full Schedule Script page loader
 * Matches the exact layout of ScheduleScriptView
 */
export function ScheduleScriptLoader() {
  return (
    <div className="space-y-6">
      {/* Header: Back button + Title + Action */}
      <div className="space-y-2">
        {/* Back button */}
        <Skeleton className="h-5 w-36" />
        {/* Title row with action button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-12 w-full sm:w-32 rounded-[6px]" />
        </div>
      </div>

      {/* Script Info Section */}
      <ScriptInfoSectionSkeleton />

      {/* Timeout */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-12 w-full md:w-[320px] rounded-[6px]" />
      </div>

      {/* Script Arguments & Environment Vars - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScriptArgumentsSkeleton />
        <ScriptArgumentsSkeleton />
      </div>

      {/* Note, Date/Time, Repeat */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-10" />
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <Skeleton className="h-12 w-full md:w-[240px] rounded-[6px]" />
          <Skeleton className="h-12 w-full md:w-[200px] rounded-[6px]" />
          <Skeleton className="h-12 w-full md:w-[200px] rounded-[6px]" />
        </div>
      </div>

      {/* Search by Device & Organization - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full rounded-[6px]" />
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-16 sm:w-20 rounded-full" />
            ))}
            <Skeleton className="h-8 w-14 sm:w-16" />
          </div>
        </div>
        <div className="space-y-3 hidden md:block">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full rounded-[6px]" />
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full" />
            ))}
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>

      {/* Select All link */}
      <div className="flex justify-end">
        <Skeleton className="h-5 w-24 sm:w-44" />
      </div>

      {/* Device Grid - responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <DeviceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
