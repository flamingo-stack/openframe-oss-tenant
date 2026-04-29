'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components';
import {
  Chevron02RightIcon,
  PenEditIcon,
  PlusCircleIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  ListPageLayout,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useScriptSchedules } from '../hooks/use-script-schedule';
import type { ScriptScheduleListItem, ScriptScheduleTaskType } from '../types/script-schedule.types';
import { formatScheduleDate } from '../types/script-schedule.types';

function getRepeatLabelFromTaskType(taskType: ScriptScheduleTaskType): string {
  switch (taskType) {
    case 'runonce':
      return 'Once';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
    case 'monthlydow':
      return 'Monthly';
    default:
      return taskType;
  }
}

export function ScriptSchedulesTable() {
  const router = useRouter();

  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });
  const pageSize = 10;

  const [searchInput, setSearchInput] = useState(params.search);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const debouncedSearchInput = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearchInput !== params.search) {
      setParam('search', debouncedSearchInput);
    }
  }, [debouncedSearchInput, params.search, setParam]);

  const { schedules, isLoading, error } = useScriptSchedules();

  const filteredSchedules = useMemo(() => {
    if (!params.search || params.search.trim() === '') return schedules;

    const searchLower = params.search.toLowerCase().trim();
    return schedules.filter(s => s.name.toLowerCase().includes(searchLower));
  }, [schedules, params.search]);

  const visibleSchedules = useMemo(() => filteredSchedules.slice(0, visibleCount), [filteredSchedules, visibleCount]);

  // Reset visible count when search changes
  const lastSearchRef = React.useRef(params.search);
  useEffect(() => {
    if (params.search !== lastSearchRef.current) {
      lastSearchRef.current = params.search;
      setVisibleCount(pageSize);
    }
  }, [params.search]);

  const columns = useMemo<ColumnDef<ScriptScheduleListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Script',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <span className="text-h4 text-ods-text-primary whitespace-nowrap text-ellipsis truncate">
            {row.original.name}
          </span>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'os',
        header: 'OS',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <OSTypeBadgeGroup osTypes={row.original.task_supported_platforms} iconSize="w-4 h-4 md:w-6 md:h-6" />
        ),
        enableSorting: false,
        meta: { width: 'w-[90px]', hideAt: 'lg' },
      },
      {
        accessorKey: 'run_time_date',
        header: 'Date & Time',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => {
          const { date, time } = formatScheduleDate(row.original.run_time_date);
          return (
            <div className="flex flex-col">
              <span className="text-h4 text-ods-text-primary">{date}</span>
              <span className="text-h6 text-ods-text-secondary">{time}</span>
            </div>
          );
        },
        meta: { width: 'w-[100px] md:w-[160px]' },
      },
      {
        accessorKey: 'task_frequency',
        header: 'Repeat',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <span className="text-h4 text-ods-text-primary">{getRepeatLabelFromTaskType(row.original.task_type)}</span>
        ),
        meta: { width: 'w-[160px]', hideAt: 'md' },
      },
      {
        accessorKey: 'agents_count',
        header: 'Devices',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <span className="text-h4 text-ods-text-primary">{row.original.agents_count}</span>
        ),
        meta: { width: 'w-[160px]', hideAt: 'lg' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <Button
            variant="outline"
            size="icon"
            onClick={e => {
              e.stopPropagation();
              router.push(`/scripts/schedules/${row.original.id}/edit`);
            }}
            className="bg-ods-card"
          >
            <PenEditIcon size={20} className="text-ods-text-primary" />
          </Button>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <Button
            href={`/scripts/schedules/${row.original.id}`}
            prefetch={false}
            variant="outline"
            size="icon"
            centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
            aria-label="View details"
            className="bg-ods-card"
          />
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [router],
  );

  const table = useDataTable<ScriptScheduleListItem>({
    data: visibleSchedules,
    columns,
    getRowId: (row: ScriptScheduleListItem) => String(row.id),
    enableSorting: false,
  });

  const scheduleRowHref = useCallback((schedule: ScriptScheduleListItem) => `/scripts/schedules/${schedule.id}`, []);

  const handleLoadMore = useCallback(() => setVisibleCount(prev => prev + pageSize), []);

  const handleAddSchedule = useCallback(() => {
    router.push('/scripts/schedules/create');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Schedule',
        variant: 'card' as const,
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddSchedule,
      },
    ],
    [handleAddSchedule],
  );

  return (
    <ListPageLayout
      title="Scripts Schedules"
      actions={actions}
      searchPlaceholder="Search for Schedule"
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
          skeletonRows={pageSize}
          emptyMessage={
            params.search
              ? `No schedules found matching "${params.search}". Try adjusting your search.`
              : 'No schedules found. Create a new schedule to get started.'
          }
          rowClassName="mb-1"
          rowHref={scheduleRowHref}
        />
        {visibleCount < filteredSchedules.length && (
          <DataTable.InfiniteFooter
            hasNextPage
            isFetchingNextPage={false}
            onLoadMore={handleLoadMore}
            skeletonRows={2}
          />
        )}
      </DataTable>
    </ListPageLayout>
  );
}
