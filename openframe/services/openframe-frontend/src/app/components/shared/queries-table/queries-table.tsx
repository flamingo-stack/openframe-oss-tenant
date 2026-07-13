'use client';

import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  MoreActionsMenu,
  type NoDataProps,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ReactNode, useCallback, useMemo } from 'react';
import { openInNewTab } from '@/lib/open-in-new-tab';
import type { QueryTableRow } from './query-table-row';

/** Schedule interval (seconds) → human label. Matches the /monitoring queries view. */
export function formatQueryInterval(seconds: number): string {
  if (seconds === 0) return 'Manual';
  if (seconds < 60) return `Every ${seconds}s`;
  if (seconds < 3600) return `Every ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)}h`;
  return `Every ${Math.floor(seconds / 86400)}d`;
}

export interface QueriesTableProps {
  rows: QueryTableRow[];
  isLoading?: boolean;
  emptyMessage?: string;
  /** Rich empty state (icon + title + description) — overrides `emptyMessage`. */
  emptyState?: NoDataProps;
  /** Make each row a link to its `href`. */
  rowAsLink?: boolean;
  stickyHeader?: boolean;
  stickyHeaderOffset?: string;
  /** Rendered at the right edge of the header (e.g. a row count). */
  rightSlot?: ReactNode;
  skeletonRows?: number;
  /** Infinite "load more" footer. */
  hasMore?: boolean;
  onLoadMore?: () => void;
}

/**
 * Shared queries table. Renders a normalized `QueryTableRow[]` with a consistent
 * column set (Query name+description, Frequency, optional row actions,
 * open-in-new-tab). Used by both the fleet-wide monitoring page and the
 * per-device Queries tab.
 */
export function QueriesTable({
  rows,
  isLoading = false,
  emptyMessage,
  emptyState,
  rowAsLink = false,
  stickyHeader = false,
  stickyHeaderOffset,
  rightSlot,
  skeletonRows = 10,
  hasMore = false,
  onLoadMore,
}: QueriesTableProps) {
  // Reserve the actions column while loading so the column count stays stable across
  // skeleton → loading → loaded (otherwise it appears once rows arrive and shifts every
  // column — the "jitter"). Loaded rows in every caller carry actions.
  const hasActions = useMemo(() => isLoading || rows.some(r => r.actions && r.actions.length > 0), [isLoading, rows]);

  const columns = useMemo<ColumnDef<QueryTableRow>[]>(() => {
    const cols: ColumnDef<QueryTableRow>[] = [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<QueryTableRow> }) => (
          <div className="flex flex-col justify-center gap-1 py-2 min-h-[60px] min-w-0">
            <TruncateText>{row.original.name}</TruncateText>
            {row.original.description && (
              <TruncateText variant="h6" tone="secondary">
                {row.original.description}
              </TruncateText>
            )}
          </div>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'frequencyLabel',
        header: 'Frequency',
        cell: ({ row }: { row: Row<QueryTableRow> }) => (
          <span className="font-medium leading-[20px] text-ods-text-primary">{row.original.frequencyLabel}</span>
        ),
        meta: { width: 'w-[120px]', hideAt: 'md' },
      },
    ];

    if (hasActions) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }: { row: Row<QueryTableRow> }) =>
          row.original.actions && row.original.actions.length > 0 ? (
            <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
              <MoreActionsMenu items={row.original.actions} />
            </div>
          ) : null,
        enableSorting: false,
        meta: { width: 'w-12 md:w-auto md:min-w-[100px] shrink-0 flex-none', align: 'right' },
      });
    }

    cols.push({
      id: 'open',
      header: '',
      cell: ({ row }: { row: Row<QueryTableRow> }) =>
        row.original.href ? (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              onClick={openInNewTab(row.original.href)}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label={`Open ${row.original.name}`}
              className="bg-ods-card"
            />
          </div>
        ) : null,
      enableSorting: false,
      meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
    });

    return cols;
  }, [hasActions]);

  const table = useDataTable<QueryTableRow>({
    data: rows,
    columns,
    getRowId: (row: QueryTableRow) => row.id,
    enableSorting: false,
  });

  const rowHref = useCallback((row: QueryTableRow) => (rowAsLink ? row.href : undefined), [rowAsLink]);

  // Hide the column header on the empty state — only show it while loading (skeleton rows)
  // or when there are real rows.
  const showHeader = isLoading || rows.length > 0;

  return (
    <DataTable table={table}>
      {showHeader && (
        <DataTable.Header stickyHeader={stickyHeader} stickyHeaderOffset={stickyHeaderOffset} rightSlot={rightSlot} />
      )}
      <DataTable.Body
        loading={isLoading}
        skeletonRows={skeletonRows}
        emptyMessage={emptyMessage}
        emptyState={emptyState}
        rowClassName="mb-1"
        rowHref={rowHref}
      />
      {hasMore && onLoadMore && (
        <DataTable.InfiniteFooter hasNextPage isFetchingNextPage={false} onLoadMore={onLoadMore} skeletonRows={2} />
      )}
    </DataTable>
  );
}
