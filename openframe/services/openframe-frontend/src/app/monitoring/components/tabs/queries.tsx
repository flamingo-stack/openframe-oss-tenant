'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DeviceCardCompact,
  ListPageLayout,
  MoreActionsMenu,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useTablePagination } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from '../../hooks/use-queries';
import type { Query } from '../../types/queries.types';

const PAGE_SIZE = 10;

function formatInterval(seconds: number): string {
  if (seconds === 0) return 'Manual';
  if (seconds < 60) return `Every ${seconds}s`;
  if (seconds < 3600) return `Every ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)}h`;
  return `Every ${Math.floor(seconds / 86400)}d`;
}

export function Queries() {
  const router = useRouter();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    page: { type: 'number', default: 1 },
  });

  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const lastSearchRef = React.useRef(params.search);

  useEffect(() => {
    if (debouncedSearchInput !== lastSearchRef.current) {
      lastSearchRef.current = debouncedSearchInput;
      setParams({ search: debouncedSearchInput, page: 1 });
    }
  }, [debouncedSearchInput, setParams]);

  const { queries, isLoading, error } = useQueries();

  const filteredQueries = useMemo(() => {
    if (!params.search || params.search.trim() === '') return queries;

    const searchLower = params.search.toLowerCase().trim();
    return queries.filter(
      query => query.name.toLowerCase().includes(searchLower) || query.description.toLowerCase().includes(searchLower),
    );
  }, [queries, params.search]);

  const paginatedQueries = useMemo(() => {
    const start = (params.page - 1) * PAGE_SIZE;
    return filteredQueries.slice(start, start + PAGE_SIZE);
  }, [filteredQueries, params.page]);

  const totalPages = useMemo(() => Math.ceil(filteredQueries.length / PAGE_SIZE), [filteredQueries.length]);

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
    ],
    [router],
  );

  const renderRowActions = useMemo(() => {
    return (query: Query) => <MoreActionsMenu items={rowActions(query)} />;
  }, [rowActions]);

  const handleRowClick = useCallback(
    (query: Query) => {
      router.push(`/monitoring/query/${query.id}`);
    },
    [router],
  );

  const handleAddQuery = useCallback(() => {
    router.push('/monitoring/query/edit/new');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Query',
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddQuery,
      },
    ],
    [handleAddQuery],
  );

  const cursorPagination = useTablePagination(
    totalPages > 1
      ? {
          type: 'client',
          currentPage: params.page,
          totalPages,
          itemCount: paginatedQueries.length,
          itemName: 'queries',
          onNext: () => setParam('page', Math.min(params.page + 1, totalPages)),
          onPrevious: () => setParam('page', Math.max(params.page - 1, 1)),
          showInfo: true,
        }
      : null,
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
    >
      <Table
        data={paginatedQueries}
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
        onRowClick={handleRowClick}
        cursorPagination={cursorPagination}
        renderRowActions={renderRowActions}
      />
    </ListPageLayout>
  );
}
