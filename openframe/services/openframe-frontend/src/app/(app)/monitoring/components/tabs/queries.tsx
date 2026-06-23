'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ArrowRightUpIcon,
  BracketCurlyEllipsisVrIcon,
  DatabaseIcon,
  HourglassClockIcon,
  HourglassIcon,
  PlusCircleIcon,
  SearchIcon,
  TimerIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  Input,
  MoreActionsMenu,
  PageError,
  PageLayout,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { useQueries } from '../../hooks/use-queries';
import type { Query } from '../../types/queries.types';

const PAGE_SIZE = 20;

function formatInterval(seconds: number): string {
  if (seconds === 0) return 'Manual';
  if (seconds < 60) return `Every ${seconds}s`;
  if (seconds < 3600) return `Every ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)}h`;
  return `Every ${Math.floor(seconds / 86400)}d`;
}

export function Queries() {
  const router = useRouter();
  const askMingo = useAskMingo();

  const { params, setParams } = useApiParams({
    search: { type: 'string', default: '' },
  });

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  // Local search keeps typing responsive; the shared hook debounces the write to
  // the URL param so we don't navigate the router (and re-filter) on every keystroke.
  const { search, setSearch, debouncedSearch } = useSearchParam(
    params.search,
    value => setParams({ search: value }),
    300,
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setVisibleCount(PAGE_SIZE);
    },
    [setSearch],
  );

  const { queries, isLoading, error, deleteQuery } = useQueries();
  const [queryToDelete, setQueryToDelete] = useState<Query | null>(null);

  const filteredQueries = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.trim() === '') return queries;

    const searchLower = debouncedSearch.toLowerCase().trim();
    return queries.filter(
      query => query.name.toLowerCase().includes(searchLower) || query.description.toLowerCase().includes(searchLower),
    );
  }, [queries, debouncedSearch]);

  const visibleQueries = useMemo(() => filteredQueries.slice(0, visibleCount), [filteredQueries, visibleCount]);

  const rowActions = useCallback(
    (query: Query) => [
      {
        label: 'Query Details',
        onClick: () => router.push(`/monitoring/query/${query.id}`),
      },
      {
        label: 'Delete Query',
        onClick: () => setQueryToDelete(query),
      },
    ],
    [router],
  );

  const columns = useMemo<ColumnDef<Query>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<Query> }) => (
          <div className="flex flex-col justify-center gap-1 py-2 min-h-[60px]">
            <TruncateText>{row.original.name}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.description}
            </TruncateText>
          </div>
        ),
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        cell: ({ row }: { row: Row<Query> }) => (
          <span className="font-medium leading-[20px] text-ods-text-primary">
            {formatInterval(row.original.interval)}
          </span>
        ),
        meta: { width: 'w-[120px]', hideAt: 'md' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<Query> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            <MoreActionsMenu items={rowActions(row.original)} />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'min-w-[100px] w-auto shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<Query> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              onClick={openInNewTab(`/monitoring/query/${row.original.id}`)}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [rowActions],
  );

  const table = useDataTable<Query>({
    data: visibleQueries,
    columns,
    getRowId: (row: Query) => String(row.id),
    enableSorting: false,
  });

  const queryRowHref = useCallback((query: Query) => `/monitoring/query/${query.id}`, []);

  const handleLoadMore = useCallback(() => setVisibleCount(prev => prev + PAGE_SIZE), []);

  const handleAddQuery = useCallback(() => {
    router.push('/monitoring/query/edit/new');
  }, [router]);

  // Show the empty state instead of the search bar + table only when there is
  // genuinely no data: loading finished, no active search, and no queries.
  const showEmptyState = !isLoading && !debouncedSearch.trim() && queries.length === 0;

  const actions = useMemo(
    () => [
      {
        label: 'Add Query',
        variant: (showEmptyState ? 'accent' : 'outline') as 'accent' | 'outline',
        icon: (
          <PlusCircleIcon
            size={24}
            className={showEmptyState ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}
          />
        ),
        onClick: handleAddQuery,
      },
    ],
    [handleAddQuery, showEmptyState],
  );

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout title="Queries" actions={actions}>
      {showEmptyState ? (
        <EmptyState
          icon={<BracketCurlyEllipsisVrIcon />}
          title="No queries yet"
          description="Real-time questions you ask across your fleet (which devices have Chrome installed, who is on an outdated OS, which machines are low on disk) will be displayed here."
          actions={[
            { icon: <SearchIcon />, label: 'Get answers across all devices in seconds' },
            { icon: <DatabaseIcon />, label: 'Use SQL-like syntax or natural language via Mingo' },
            { icon: <HourglassClockIcon />, label: 'Save queries to rerun later or schedule them' },
          ]}
          buttonLabel="Ask Mingo about Queries"
          buttonIcon={
            <MingoIcon
              className="size-5"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          onButtonClick={() => askMingo('queries')}
        />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-system-l)]" style={containerStyle}>
          <div
            ref={toolbarRef}
            className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]"
          >
            <Input
              placeholder="Search for Queries"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              startAdornment={<SearchIcon />}
            />
          </div>

          <DataTable table={table}>
            <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} rightSlot={<DataTable.RowCount />} />
            <DataTable.Body
              loading={isLoading}
              skeletonRows={PAGE_SIZE}
              emptyMessage={
                debouncedSearch
                  ? `No queries found matching "${debouncedSearch}". Try adjusting your search.`
                  : 'No queries found.'
              }
              rowClassName="mb-1"
              rowHref={queryRowHref}
            />
            {visibleCount < filteredQueries.length && (
              <DataTable.InfiniteFooter
                hasNextPage
                isFetchingNextPage={false}
                onLoadMore={handleLoadMore}
                skeletonRows={2}
              />
            )}
          </DataTable>
        </div>
      )}
      <ConfirmDeleteMonitoringModal
        open={!!queryToDelete}
        onOpenChange={open => {
          if (!open) setQueryToDelete(null);
        }}
        itemName={queryToDelete?.name ?? ''}
        itemType="query"
        onConfirm={() => {
          if (queryToDelete) {
            deleteQuery(queryToDelete.id, {
              onSuccess: () => setQueryToDelete(null),
            });
          }
        }}
      />
    </PageLayout>
  );
}
