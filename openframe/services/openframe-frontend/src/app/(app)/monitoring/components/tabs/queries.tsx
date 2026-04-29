'use client';

import { Chevron02RightIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  DeviceCardCompact,
  ListPageLayout,
  MoreActionsMenu,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const { params, setParams } = useApiParams({
    search: { type: 'string', default: '' },
  });

  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const lastSearchRef = React.useRef(params.search);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (debouncedSearchInput !== lastSearchRef.current) {
      lastSearchRef.current = debouncedSearchInput;
      setParams({ search: debouncedSearchInput });
      setVisibleCount(PAGE_SIZE);
    }
  }, [debouncedSearchInput, setParams]);

  const { queries, isLoading, error, deleteQuery } = useQueries();
  const [queryToDelete, setQueryToDelete] = useState<Query | null>(null);

  const filteredQueries = useMemo(() => {
    if (!params.search || params.search.trim() === '') return queries;

    const searchLower = params.search.toLowerCase().trim();
    return queries.filter(
      query => query.name.toLowerCase().includes(searchLower) || query.description.toLowerCase().includes(searchLower),
    );
  }, [queries, params.search]);

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
          <DeviceCardCompact deviceName={row.original.name} organization={row.original.description} />
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
              href={`/monitoring/query/${row.original.id}`}
              prefetch={false}
              variant="outline"
              size="icon"
              centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
              aria-label="View details"
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

  const actions = useMemo(
    () => [
      {
        label: 'Add Query',
        variant: 'card' as const,
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddQuery,
      },
    ],
    [handleAddQuery],
  );

  return (
    <ListPageLayout
      title="Queries"
      actions={actions}
      searchPlaceholder="Search for Queries"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
      stickyHeader
    >
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={PAGE_SIZE}
          emptyMessage={
            params.search
              ? `No queries found matching "${params.search}". Try adjusting your search.`
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
    </ListPageLayout>
  );
}
