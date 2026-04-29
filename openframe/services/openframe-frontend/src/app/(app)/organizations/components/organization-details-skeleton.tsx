'use client';

import {
  type ColumnDef,
  DataTable,
  Skeleton,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useMemo } from 'react';

/**
 * Mirrors PageLayout's TitleBlock used by OrganizationDetailsView with `variant="card"`.
 *
 * Layout (matches `TitleBlock` in `@flamingo-stack/openframe-frontend-core`):
 * - Mobile (< md): row, items-end, justify-between. Self-padded card with border.
 *   Back button hidden. Actions collapse to a single icon-button.
 * - md (768–1024px): column, items-start. Transparent, no border, no internal padding.
 * - lg (≥ 1024px): row, items-end, justify-between.
 */
export function OrganizationHeaderSkeleton() {
  return (
    <div
      className={cn(
        'flex items-end justify-between gap-[var(--spacing-system-m)]',
        'md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between',
        'pt-[var(--spacing-system-l)]',
        // card variant: card bg/border + padding on mobile only
        'bg-ods-card border-b border-ods-border px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]',
        'md:bg-transparent md:border-b-0 md:px-0 md:pb-0 md:mb-[var(--spacing-system-l)]',
      )}
    >
      <div className="flex flex-col gap-[var(--spacing-system-xs)] flex-1 min-w-0">
        {/* Back button (hidden on mobile to match TitleBlock) */}
        <Skeleton className="h-10 w-44 hidden md:block" />
        {/* Identity row: logo + (title + subtitle) */}
        <div className="flex items-center gap-[var(--spacing-system-m)] min-w-0 w-full">
          <Skeleton className="size-12 md:size-16 shrink-0 rounded-md" />
          <div className="flex flex-col justify-center gap-1 flex-1 min-w-0">
            <Skeleton className="h-7 md:h-9 w-72 max-w-full" />
            <Skeleton className="h-5 w-56 max-w-full" />
          </div>
        </div>
      </div>
      <div className="shrink-0 flex gap-2 items-center">
        {/* Mobile: single icon button (icon-buttons variant collapses on mobile) */}
        <Skeleton className="h-12 w-12 rounded-[6px] md:hidden" />
        {/* Desktop: full action buttons */}
        <Skeleton className="h-12 w-[200px] rounded-[6px] hidden md:block" />
        <Skeleton className="h-12 w-[180px] rounded-[6px] hidden md:block" />
      </div>
    </div>
  );
}

/** Tab navigation skeleton — 4 tabs with icon + label and an underline. */
export function OrganizationTabNavigationSkeleton() {
  return (
    <div className="relative w-full h-14 border-b border-ods-border">
      <div className="flex gap-1 items-center h-full overflow-hidden">
        {['w-[110px]', 'w-[100px]', 'w-[90px]', 'w-[100px]'].map((w, i) => (
          <div key={i} className={`flex gap-2 items-center justify-center p-4 shrink-0 h-14 ${w}`}>
            <Skeleton className="h-6 w-6 shrink-0" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inline title skeleton (e.g. "Devices") with optional right-side actions. */
function TabTitleSkeleton({ titleWidth = 'w-32', actionWidth }: { titleWidth?: string; actionWidth?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <Skeleton className={`h-10 ${titleWidth}`} />
      {actionWidth && <Skeleton className={`h-12 ${actionWidth} rounded-[6px]`} />}
    </div>
  );
}

/**
 * Skeleton matching the redesigned Details tab: a single info card with
 * Website (full-width row) + Physical/Mailing Address (two cells, stacking on mobile).
 */
export function OrganizationDetailsTabSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] flex flex-col">
      {/* Row 1: Website (with leading icon) */}
      <div className="flex gap-4 px-4 h-20 items-center border-b border-ods-border">
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <Skeleton className="size-6 shrink-0" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
      {/* Row 2: Physical + Mailing Address — stacks on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row md:gap-4 px-4 py-4 md:py-0 md:h-20 md:items-center gap-4">
        {[0, 1].map(i => (
          <div key={i} className="flex-1 min-w-0 flex flex-col gap-1">
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_SKELETON_ROWS: unknown[] = [];

/**
 * Skeleton matching a generic data-table tab (Devices / Tickets / Logs).
 * Renders an empty `DataTable` with `loading=true` so the skeleton matches the
 * real table's column layout 1:1.
 */
function makeTableTabSkeleton(columns: Array<{ id: string; header: string; width: string }>) {
  function Component({ titleWidth, actionWidth }: { titleWidth: string; actionWidth?: string }) {
    const colDefs = useMemo<ColumnDef<unknown>[]>(
      () =>
        columns.map(col => ({
          id: col.id,
          accessorKey: col.id,
          header: col.header,
          enableSorting: false,
          meta: { width: col.width },
        })),
      [],
    );
    const table = useDataTable<unknown>({
      data: EMPTY_SKELETON_ROWS,
      columns: colDefs,
      getRowId: () => '',
      enableSorting: false,
    });
    return (
      <div className="flex flex-col gap-4">
        <TabTitleSkeleton titleWidth={titleWidth} actionWidth={actionWidth} />
        <Skeleton className="h-12 w-full rounded-[6px]" />
        <DataTable table={table}>
          <DataTable.Header />
          <DataTable.Body loading skeletonRows={8} emptyMessage="" rowClassName="mb-1" />
        </DataTable>
      </div>
    );
  }
  Component.displayName = 'TableTabSkeleton';
  return Component;
}

const DevicesTableSkeletonInner = makeTableTabSkeleton([
  { id: 'device', header: 'DEVICE', width: 'flex-1' },
  { id: 'status', header: 'STATUS', width: 'w-[200px]' },
  { id: 'os', header: 'OS', width: 'w-[200px]' },
  { id: 'open', header: '', width: 'w-12 shrink-0' },
]);

const TicketsTableSkeletonInner = makeTableTabSkeleton([
  { id: 'title', header: 'TITLE', width: 'flex-1' },
  { id: 'source', header: 'SOURCE', width: 'w-[240px]' },
  { id: 'created', header: 'CREATED', width: 'w-[180px]' },
  { id: 'status', header: 'STATUS', width: 'w-[140px]' },
  { id: 'open', header: '', width: 'w-12 shrink-0' },
]);

const LogsTableSkeletonInner = makeTableTabSkeleton([
  { id: 'logId', header: 'LOG ID', width: 'w-[200px]' },
  { id: 'status', header: 'STATUS', width: 'w-[120px]' },
  { id: 'tool', header: 'TOOL', width: 'w-[150px]' },
  { id: 'source', header: 'SOURCE', width: 'w-[180px]' },
  { id: 'description', header: 'LOG DETAILS', width: 'flex-1' },
  { id: 'open', header: '', width: 'w-12 shrink-0' },
]);

export function OrganizationDevicesTabSkeleton() {
  return <DevicesTableSkeletonInner titleWidth="w-32" actionWidth="w-[160px]" />;
}

export function OrganizationTicketsTabSkeleton() {
  return <TicketsTableSkeletonInner titleWidth="w-32" actionWidth="w-[160px]" />;
}

export function OrganizationLogsTabSkeleton() {
  return <LogsTableSkeletonInner titleWidth="w-24" actionWidth="w-[120px]" />;
}

export function getOrganizationTabSkeleton(activeTab: string) {
  switch (activeTab) {
    case 'tickets':
      return <OrganizationTicketsTabSkeleton />;
    case 'logs':
      return <OrganizationLogsTabSkeleton />;
    case 'details':
      return <OrganizationDetailsTabSkeleton />;
    default:
      return <OrganizationDevicesTabSkeleton />;
  }
}

interface OrganizationDetailsSkeletonProps {
  activeTab?: string;
}

/**
 * Full-page skeleton matching `OrganizationDetailsView`'s PageLayout structure:
 * - Mobile: outer container has no padding; header is a self-padded card; content is self-padded.
 * - md+: outer container has p-l; header and content are flush.
 */
export function OrganizationDetailsSkeleton({ activeTab = 'devices' }: OrganizationDetailsSkeletonProps) {
  return (
    <div className="flex flex-col w-full md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]">
      <OrganizationHeaderSkeleton />
      <div className="flex flex-col gap-[var(--spacing-system-l)] px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] md:px-0 md:pb-0">
        <OrganizationTabNavigationSkeleton />
        {getOrganizationTabSkeleton(activeTab)}
      </div>
    </div>
  );
}
