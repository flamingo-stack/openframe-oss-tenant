'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components';
import { PenEditIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, ListPageLayout, Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui';
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

  const columns: TableColumn<ScriptScheduleListItem>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Script',
        renderCell: schedule => (
          <span className="text-h4 text-ods-text-primary overflow-x-hidden whitespace-nowrap text-ellipsis">
            {schedule.name}
          </span>
        ),
      },
      {
        key: 'run_time_date',
        label: 'Date & Time',
        width: 'w-[160px]',
        hideAt: 'md',
        renderCell: schedule => {
          const { date, time } = formatScheduleDate(schedule.run_time_date);
          return (
            <div className="flex flex-col">
              <span className="font-medium text-[14px] leading-[20px] text-ods-text-primary">{date}</span>
              <span className="text-[12px] leading-[16px] text-ods-text-secondary">{time}</span>
            </div>
          );
        },
      },
      {
        key: 'task_type',
        label: 'Repeat',
        width: 'w-[120px]',
        hideAt: 'md',
        renderCell: schedule => (
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-primary">
            {getRepeatLabelFromTaskType(schedule.task_type)}
          </span>
        ),
      },
      {
        key: 'task_supported_platforms',
        label: 'Platforms',
        width: 'w-[100px]',
        hideAt: 'lg',
        renderCell: schedule => <OSTypeBadgeGroup osTypes={schedule.task_supported_platforms} iconSize="w-4 h-4" />,
      },
      {
        key: 'agents_count',
        label: 'Devices',
        width: 'w-[100px]',
        hideAt: 'lg',
        renderCell: schedule => (
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-primary">{schedule.agents_count}</span>
        ),
      },
    ],
    [],
  );

  const handleRowClick = useCallback(
    (schedule: ScriptScheduleListItem) => {
      router.push(`/scripts/schedules/${schedule.id}`);
    },
    [router],
  );

  const handleAddSchedule = useCallback(() => {
    router.push('/scripts/schedules/create');
  }, [router]);

  const renderRowActions = useMemo(() => {
    return (schedule: ScriptScheduleListItem) => (
      <Button
        variant="outline"
        size="icon"
        onClick={e => {
          e.stopPropagation();
          router.push(`/scripts/schedules/${schedule.id}/edit`);
        }}
        className="bg-ods-card"
      >
        <PenEditIcon size={20} className="text-ods-text-primary" />
      </Button>
    );
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Schedule',
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
      <Table
        data={visibleSchedules}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={pageSize}
        emptyMessage={
          params.search
            ? `No schedules found matching "${params.search}". Try adjusting your search.`
            : 'No schedules found. Create a new schedule to get started.'
        }
        rowClassName="mb-1"
        onRowClick={handleRowClick}
        infiniteScroll={{
          hasNextPage: visibleCount < filteredSchedules.length,
          isFetchingNextPage: false,
          onLoadMore: () => setVisibleCount(prev => prev + pageSize),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
        renderRowActions={renderRowActions}
      />
    </ListPageLayout>
  );
}
