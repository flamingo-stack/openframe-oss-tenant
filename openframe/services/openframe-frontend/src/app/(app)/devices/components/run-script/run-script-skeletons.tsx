'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { RUN_SUMMARY_LABELS, ScriptSummaryCardSkeleton } from '../../../scripts/v2/components/script-summary-card';

/** Description widths cycled through the picker rows so they don't look uniform. */
const PICKER_ROW_DESCRIPTIONS = ['w-72', 'w-56', 'w-48', 'w-64', 'w-40', 'w-60'];

/**
 * Skeleton for {@link PickerList} (select step). Mirrors a run-script picker row
 * exactly: name over description on the left, a single OS badge on the right,
 * each row separated by the same bottom hairline / padding as the real list.
 */
export function RunScriptSelectListSkeleton() {
  return (
    <div>
      {PICKER_ROW_DESCRIPTIONS.map(descWidth => (
        <div
          key={descWidth}
          className="flex w-full items-center gap-[var(--spacing-system-mf)] border-b border-ods-border px-[var(--spacing-system-mf)] py-[var(--spacing-system-sf)] last:border-b-0"
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-[var(--spacing-system-xxs)]">
            <Skeleton className="h-5 w-40" />
            <Skeleton className={`h-4 max-w-full ${descWidth}`} />
          </div>
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  );
}

/** One arguments column (title label + a key/value row + an add button). */
function ArgumentsSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-sf)]">
      <Skeleton className="h-5 w-36" />
      <div className="flex items-center gap-[var(--spacing-system-xsf)]">
        <Skeleton className="h-12 flex-1 rounded-md" />
        <Skeleton className="h-12 flex-1 rounded-md" />
        <Skeleton className="h-12 w-12 rounded-md" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

/**
 * Skeleton for {@link RunScriptConfigStep} (config step). Mirrors it exactly:
 * summary card (3 stats — Shell / Platforms / Added by), the Timeout input +
 * Run as User checkbox row, then Script Arguments and Environment Vars stacked
 * one per line, with the pinned Back / Run Script footer.
 */
export function RunScriptConfigStepSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
      <div className="min-h-0 flex-1 space-y-[var(--spacing-system-l)] overflow-y-auto">
        <ScriptSummaryCardSkeleton labels={RUN_SUMMARY_LABELS} />

        {/* Timeout + Run as User */}
        <div className="grid grid-cols-1 items-end gap-[var(--spacing-system-l)] lg:grid-cols-2">
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>

        {/* Script Arguments + Environment Vars — one per line */}
        <ArgumentsSkeleton />
        <ArgumentsSkeleton />
      </div>

      {/* Footer: Back / Run Script */}
      <div className="flex shrink-0 gap-[var(--spacing-system-mf)] border-t border-ods-border pt-[var(--spacing-system-mf)]">
        <Skeleton className="h-12 flex-1 rounded-md" />
        <Skeleton className="h-12 flex-1 rounded-md" />
      </div>
    </div>
  );
}
