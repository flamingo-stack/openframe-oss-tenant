'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSearchParams } from 'next/navigation';
import { ScriptExecutionsSkeleton } from './script-executions-tab';

const noop = () => {};

/**
 * Skeleton for {@link ScriptSummaryCard}: the name + description header followed
 * by a metadata strip. `stats` controls how many meta cells are drawn — 4 on the
 * details page (Shell / Platforms / Timeout / Added by), 2 on the run page.
 */
export function ScriptSummaryCardSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-ods-border p-[var(--spacing-system-m)]">
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

/** Row of clickable tag chips under the title (mirrors the `Tag` outline chips). */
const TAG_CHIP_WIDTHS = ['w-28', 'w-24', 'w-40', 'w-32'];
function TagsRowSkeleton() {
  return (
    <div className="flex flex-wrap items-start gap-[var(--spacing-system-xs)]">
      {TAG_CHIP_WIDTHS.map(width => (
        <Skeleton key={width} className={`h-8 ${width} rounded-md`} />
      ))}
    </div>
  );
}

/**
 * Tab navigation strip skeleton (Script Details | Execution History). Mirrors the
 * core `TabNavigation` layout — icon + label cells with `p-m` and a bottom
 * hairline — but without the active tab's accent underline (no need on a loader).
 */
function DetailsTabsSkeleton() {
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-start gap-[var(--spacing-system-xxs)] overflow-hidden">
        <div className="flex shrink-0 items-center justify-center gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-m)]">
          <Skeleton className="h-4 w-4 md:h-6 md:w-6 rounded" />
          <Skeleton className="h-[18px] w-24" />
        </div>
        <div className="flex shrink-0 items-center justify-center gap-[var(--spacing-system-xxs)] p-[var(--spacing-system-m)]">
          <Skeleton className="h-4 w-4 md:h-6 md:w-6 rounded" />
          <Skeleton className="h-[18px] w-36" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-ods-border" />
    </div>
  );
}

/** Skeleton for a {@link ScriptArgumentsCard}: caption label + key——value rows. */
function InfoCardSkeleton() {
  return (
    <div className="flex flex-col gap-1 w-full">
      <Skeleton className="h-5 w-44" />
      <div className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-m)] flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <div className="flex-1 h-px bg-ods-border" />
            <Skeleton className="h-5 w-16" />
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
 * `PageLayout` (Back, Run Script split action, Edit Script menu) so only the body
 * swaps when the Relay query resolves — matching {@link ScriptDetailsView}: tags
 * row, summary card (4 stats), tab navigation, then the Script Details tab body
 * (default args + env cards, then the Syntax editor).
 */
export function ScriptDetailsSkeleton() {
  // Match the active tab from the URL so the body skeleton lines up with what
  // resolves — the Execution History tab loads a table, not the args/env + editor.
  const isExecutionsTab = useSearchParams().get('tab') === 'executions';

  const actions = [
    {
      label: 'Run Script',
      variant: 'accent' as const,
      disabled: true,
      onClick: noop,
      iconAction: {
        icon: <ArrowRightUpIcon className="w-5 h-5" />,
        'aria-label': 'Open Run Script in new tab',
        onClick: noop,
        disabled: true,
      },
    },
  ];
  const menuActions = [{ items: [{ id: 'edit-script', label: 'Edit Script', disabled: true }] }];

  return (
    <PageLayout
      title="Script Details"
      backButton={{ label: 'Back', onClick: noop }}
      actions={actions}
      menuActions={menuActions}
      actionsVariant="menu-primary"
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6">
        <TagsRowSkeleton />
        <ScriptSummaryCardSkeleton stats={4} />
        <DetailsTabsSkeleton />
        {isExecutionsTab ? (
          <ScriptExecutionsSkeleton />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InfoCardSkeleton />
              <InfoCardSkeleton />
            </div>
            <EditorSkeleton />
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/** A value-over-label cell skeleton in the execution-details card. */
function DetailCellSkeleton({
  valueWidth = 'w-28',
  labelWidth = 'w-24',
}: {
  valueWidth?: string;
  labelWidth?: string;
}) {
  return (
    <div className="flex flex-[1_0_0] min-w-[140px] flex-col justify-center gap-1">
      <Skeleton className={`h-6 ${valueWidth}`} />
      <Skeleton className={`h-4 ${labelWidth}`} />
    </div>
  );
}

/**
 * Loading state for the {@link ScriptExecutionDetailsView} page: the identity row
 * (Script Name / Device / Executed by / Status), the timing row (Privilege /
 * Start / Finish / Execution Time), then the Result block.
 */
export function ScriptExecutionDetailsSkeleton() {
  const actions = [{ label: 'Copy Execution Details', variant: 'outline' as const, disabled: true, onClick: noop }];

  return (
    <PageLayout
      title="Script Execution Details"
      backButton={{ label: 'Back', onClick: noop }}
      actions={actions}
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-hidden">
        <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] border-b border-ods-border p-[var(--spacing-system-m)]">
          <DetailCellSkeleton valueWidth="w-40" labelWidth="w-24" />
          <DetailCellSkeleton valueWidth="w-32" labelWidth="w-20" />
          <DetailCellSkeleton valueWidth="w-36" labelWidth="w-24" />
          <DetailCellSkeleton valueWidth="w-24" labelWidth="w-16" />
        </div>
        <div className="flex flex-wrap items-center gap-[var(--spacing-system-m)] border-b border-ods-border p-[var(--spacing-system-m)]">
          <DetailCellSkeleton valueWidth="w-20" labelWidth="w-28" />
          <DetailCellSkeleton valueWidth="w-32" labelWidth="w-20" />
          <DetailCellSkeleton valueWidth="w-32" labelWidth="w-20" />
          <DetailCellSkeleton valueWidth="w-16" labelWidth="w-36" />
        </div>
        <div className="flex flex-col gap-1 p-[var(--spacing-system-m)]">
          <Skeleton className="h-5 w-3/4 max-w-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </PageLayout>
  );
}
