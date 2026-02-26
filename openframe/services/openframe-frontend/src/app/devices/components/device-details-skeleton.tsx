'use client';

import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * Info field skeleton — value on top, label below
 */
function InfoFieldSkeleton({ valueWidth = 'w-32' }: { valueWidth?: string }) {
  return (
    <div>
      <Skeleton className={`h-5 ${valueWidth} mb-1`} />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

/**
 * Device info section skeleton — 3 rows x 4 columns
 */
function DeviceInfoSectionSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-40" />
        <InfoFieldSkeleton valueWidth="w-28" />
        <InfoFieldSkeleton valueWidth="w-48" />
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-20" />
        <InfoFieldSkeleton valueWidth="w-44" />
        <InfoFieldSkeleton valueWidth="w-44" />
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <InfoFieldSkeleton valueWidth="w-52" />
        <InfoFieldSkeleton valueWidth="w-10" />
        <InfoFieldSkeleton valueWidth="w-56" />
        <InfoFieldSkeleton valueWidth="w-24" />
      </div>
    </div>
  );
}

/**
 * Tab navigation skeleton — 9 tabs
 */
function TabNavigationSkeleton() {
  const tabWidths = [
    'w-[110px]',
    'w-[100px]',
    'w-[100px]',
    'w-[120px]',
    'w-[90px]',
    'w-[80px]',
    'w-[100px]',
    'w-[140px]',
    'w-[80px]',
  ];
  return (
    <div className="flex gap-1 border-b border-ods-border overflow-hidden">
      {tabWidths.map((w, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: This is a static array of widths for skeleton tabs, so using index as key is acceptable here.
        <Skeleton key={i} className={`h-10 ${w} rounded-t-md`} />
      ))}
    </div>
  );
}

function DiskCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 w-[240px]">
      <Skeleton className="h-5 w-28 mb-1" />
      <Skeleton className="h-4 w-40 mb-3" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mt-3 rounded-full" />
    </div>
  );
}

function RamCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 w-[240px]">
      <Skeleton className="h-5 w-32 mb-1" />
      <Skeleton className="h-4 w-12 mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function CpuCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 w-[240px]">
      <Skeleton className="h-5 w-36 mb-3" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

function HardwareTabSkeleton() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="flex gap-4 flex-wrap">
          <DiskCardSkeleton />
          <DiskCardSkeleton />
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-20 mb-3" />
        <RamCardSkeleton />
      </div>
      <div>
        <Skeleton className="h-4 w-10 mb-3" />
        <CpuCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Device details page skeleton using DetailPageContainer
 */
export function DeviceDetailsSkeleton() {
  return (
    <DetailPageContainer
      headerContent={
        <div className="flex items-end justify-between md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between gap-4 w-full pt-8">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-48 sm:h-10 sm:w-56" />
            <div className="flex gap-3 items-center">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-12 w-[170px] rounded-[6px]" />
            <Skeleton className="h-12 w-[160px] rounded-[6px]" />
            <Skeleton className="h-12 w-[150px] rounded-[6px]" />
            <Skeleton className="h-12 w-12 rounded-[6px]" />
          </div>
        </div>
      }
      padding="none"
    >
      <div className="flex-1 overflow-auto">
        <DeviceInfoSectionSkeleton />
        <div className="mt-6">
          <TabNavigationSkeleton />
          <HardwareTabSkeleton />
        </div>
      </div>
    </DetailPageContainer>
  );
}
