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
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

/**
 * ScriptInfoSection skeleton — description row + 3-column info bar
 */
function ScriptInfoSectionSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-6 space-y-4">
      {/* Description + label */}
      <div>
        <Skeleton className="h-5 w-80 mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* 3-column info: Shell Type, Supported Platforms, Category */}
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-28" />
        <InfoFieldSkeleton valueWidth="w-24" />
      </div>
    </div>
  );
}

/**
 * Code editor skeleton
 */
function CodeEditorSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-4 h-[400px] flex flex-col gap-2">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton lines
          key={i}
          className="h-4"
          style={{ width: `${Math.max(20, 80 - i * 5 + ((i * 17) % 30))}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Script details page skeleton
 */
export function ScriptDetailsSkeleton() {
  return (
    <DetailPageContainer
      headerContent={
        <div className="flex items-end justify-between md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between gap-4 w-full pt-8">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-72 sm:h-10 sm:w-96" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-12 w-[150px] rounded-[6px]" />
            <Skeleton className="h-12 w-[150px] rounded-[6px]" />
          </div>
        </div>
      }
      padding="none"
    >
      <div className="flex flex-col overflow-auto gap-6">
        <ScriptInfoSectionSkeleton />

        {/* Syntax label + editor */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-16" />
          <CodeEditorSkeleton />
        </div>
      </div>
    </DetailPageContainer>
  );
}
