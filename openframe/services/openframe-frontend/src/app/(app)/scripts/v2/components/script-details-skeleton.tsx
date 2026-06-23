'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/**
 * Skeleton for {@link ScriptSummaryCard}: the name + description header followed
 * by a metadata strip. `stats` controls how many meta cells are drawn — 3 on the
 * details page (Shell / Platforms / Timeout), 2 on the run page (no Timeout).
 */
export function ScriptSummaryCardSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-ods-border p-[var(--spacing-system-m)]">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]">
        {Array.from({ length: stats }, (_, i) => (
          <div key={i} className="flex flex-[1_0_0] min-w-[140px] flex-col justify-center gap-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Code editor block skeleton (Syntax label + editor surface). */
function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-5 w-16" />
      <div className="bg-ods-card border border-ods-border rounded-lg p-4 h-[400px] flex flex-col gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${Math.max(20, 80 - i * 5 + ((i * 17) % 30))}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading state for the v2 Script Details page. Renders inside the real
 * `PageLayout` (title, Back button, disabled Run Script action) so only the body
 * swaps when the Relay query resolves — matching {@link ScriptDetailsView}:
 * summary card, then the Syntax editor.
 */
export function ScriptDetailsSkeleton() {
  const placeholderActions = [{ label: 'Run Script', onClick: () => {}, variant: 'accent' as const, disabled: true }];

  return (
    <PageLayout
      title="Script Details"
      backButton={{ label: 'Back', onClick: () => {} }}
      actions={placeholderActions}
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6">
        <ScriptSummaryCardSkeleton stats={3} />
        <EditorSkeleton />
      </div>
    </PageLayout>
  );
}
