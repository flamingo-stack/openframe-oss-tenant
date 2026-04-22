'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DeviceCardCompact,
  ListPageLayout,
  MoreActionsMenu,
  Table,
  type TableColumn,
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

  const columns: TableColumn<Query>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        renderCell: query => <DeviceCardCompact deviceName={query.name} organization={query.description} />,
      },
      {
        key: 'frequency',
        label: 'Frequency',
        width: 'w-[120px]',
        hideAt: 'md',
        renderCell: query => (
          <span className="font-medium leading-[20px] text-ods-text-primary">{formatInterval(query.interval)}</span>
        ),
      },
    ],
    [],
  );

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

  const renderRowActions = useMemo(() => {
    return (query: Query) => <MoreActionsMenu items={rowActions(query)} />;
  }, [rowActions]);

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
      <Table
        data={visibleQueries}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={PAGE_SIZE}
        emptyMessage={
          params.search
            ? `No queries found matching "${params.search}". Try adjusting your search.`
            : 'No queries found.'
        }
        showFilters={false}
        rowClassName="mb-1"
        rowHref={query => `/monitoring/query/${query.id}`}
        infiniteScroll={{
          hasNextPage: visibleCount < filteredQueries.length,
          isFetchingNextPage: false,
          onLoadMore: () => setVisibleCount(prev => prev + PAGE_SIZE),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
        renderRowActions={renderRowActions}
      />
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
