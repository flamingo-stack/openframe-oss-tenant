'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * Supported Platform section skeleton
 * 3 platform cards + Run as User checkbox (4 cols on lg)
 */
function PlatformSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-40 mb-2" />
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
        <Skeleton className="h-14 col-span-3 lg:col-span-1 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Form fields row skeleton (Name, Shell Type, Category, Timeout)
 * 2 cols on mobile, 4 cols on lg
 */
function FormFieldsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Description textarea skeleton
 */
function DescriptionSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-24 mb-2" />
      <Skeleton className="h-28 w-full rounded-md" />
    </div>
  );
}

/**
 * Script Arguments / Environment Variables skeleton
 * Shows add button placeholder with 2 arg rows
 */
function ArgumentsSkeleton() {
  return (
    <div className="flex-1 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-36" />
      </div>
    </div>
  );
}

/**
 * Syntax / Code editor skeleton
 */
function EditorSkeleton() {
  return (
    <div>
      <Skeleton className="h-6 w-16 mb-2" />
      <Skeleton className="h-[300px] lg:h-[600px] w-full rounded-md" />
    </div>
  );
}

/**
 * Full Edit Script page loader
 * Matches the exact layout of EditScriptPage + ScriptFormFields
 */
export function EditScriptSkeleton() {
  return (
    <div className="min-h-screen bg-ods-bg">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header: Back link */}
        <Skeleton className="h-5 w-40" />

        {/* Title row + action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-32" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-28 rounded-md" />
            <Skeleton className="h-12 w-28 rounded-md" />
          </div>
        </div>

        {/* Supported Platform */}
        <PlatformSkeleton />

        {/* Name, Shell Type, Category, Timeout */}
        <FormFieldsSkeleton />

        {/* Description */}
        <DescriptionSkeleton />

        {/* Script Arguments + Environment Vars */}
        <div className="flex flex-col lg:flex-row gap-6">
          <ArgumentsSkeleton />
          <ArgumentsSkeleton />
        </div>

        {/* Syntax / Editor */}
        <EditorSkeleton />
      </div>
    </div>
  );
}
