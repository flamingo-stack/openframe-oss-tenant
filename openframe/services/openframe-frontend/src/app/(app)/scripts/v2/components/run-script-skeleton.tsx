'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { ScriptSummaryCardSkeleton } from './script-details-skeleton';

/** One arguments column (title + a couple of key/value rows). */
function ArgumentsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-36" />
      {[0, 1].map(i => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-md" />
          <Skeleton className="h-12 flex-1 rounded-md" />
        </div>
      ))}
      <Skeleton className="h-5 w-44" />
    </div>
  );
}

/**
 * Loading state for the v2 Run Script page. Renders inside the real `PageLayout`
 * (title, Back button, disabled Run Script action) so only the body swaps when
 * the Relay query resolves — matching {@link RunScriptView}: summary card (no
 * Timeout cell), the editable Timeout input, arguments + env vars, then the
 * device selector.
 */
export function RunScriptSkeleton() {
  const placeholderActions = [{ label: 'Run Script', onClick: () => {}, variant: 'accent' as const, disabled: true }];

  return (
    <PageLayout
      title="Run Script"
      backButton={{ label: 'Back', onClick: () => {} }}
      actions={placeholderActions}
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="flex-1 overflow-auto">
        <ScriptSummaryCardSkeleton stats={2} />

        {/* Timeout */}
        <div className="pt-6 space-y-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-12 w-full md:max-w-[320px] rounded-md" />
        </div>

        {/* Script Arguments + Environment Vars */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ArgumentsSkeleton />
          <ArgumentsSkeleton />
        </div>

        {/* Device selector */}
        <div className="pt-6 space-y-3">
          <Skeleton className="h-12 w-full rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
