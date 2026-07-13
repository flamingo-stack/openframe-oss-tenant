'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ArrowRightUpIcon,
  HourglassClockIcon,
  LaptopIcon,
  ListBulletIcon,
  PenEditIcon,
  PlusCircleIcon,
  RadarIcon,
  SearchIcon,
  TimerIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  DataTable,
  Input,
  PageError,
  PageLayout,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
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
  const askMingo = useAskMingo();

  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });
  const pageSize = 10;

  // Search keeps typing responsive; the shared hook debounces the write to the
  // URL param (which drives filtering) and guards the back/forward sync-down
  // against clobbering typing.
  const { search: searchInput, setSearch: setSearchInput } = useSearchParam(
    params.search,
    value => setParam('search', value),
    300,
  );
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

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

  const renderRowActions = useCallback((schedule: ScriptScheduleListItem) => {
    const editHref = routes.scripts.schedules.edit(schedule.id);
    const devicesHref = routes.scripts.schedules.devices(schedule.id);
    const newTabIcon = <ArrowRightUpIcon className="w-5 h-5 text-ods-text-secondary" />;

    const groups: ActionsMenuGroup[] = [
      {
        items: [
          {
            id: 'edit-schedule',
            label: 'Edit Schedule',
            icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: editHref,
            iconAction: {
              icon: newTabIcon,
              'aria-label': 'Open Edit Schedule in new tab',
              href: editHref,
              openInNewTab: true,
            },
          },
          {
            id: 'edit-devices',
            label: 'Edit Devices',
            icon: <LaptopIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: devicesHref,
            iconAction: {
              icon: newTabIcon,
              'aria-label': 'Open Edit Devices in new tab',
              href: devicesHref,
              openInNewTab: true,
            },
          },
        ],
      },
    ];

    return <ActionsMenuDropdown groups={groups} />;
  }, []);

  const columns = useMemo<ColumnDef<ScriptScheduleListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Script',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => <TruncateText>{row.original.name}</TruncateText>,
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
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<ScriptScheduleListItem> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              onClick={openInNewTab(routes.scripts.schedules.details(row.original.id))}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
      },
    ],
    [renderRowActions],
  );

  const table = useDataTable<ScriptScheduleListItem>({
    data: visibleSchedules,
    columns,
    getRowId: (row: ScriptScheduleListItem) => String(row.id),
    enableSorting: false,
  });

  const scheduleRowHref = useCallback(
    (schedule: ScriptScheduleListItem) => routes.scripts.schedules.details(schedule.id),
    [],
  );

  const handleLoadMore = useCallback(() => setVisibleCount(prev => prev + pageSize), []);

  const handleAddSchedule = useCallback(() => {
    router.push(routes.scripts.schedules.new);
  }, [router]);

  // Show the empty state instead of the search bar + table only when there is
  // genuinely no data: loading finished, no active search, and no schedules.
  const showEmptyState = !isLoading && !params.search.trim() && schedules.length === 0;

  const actions = useMemo(
    () => [
      {
        label: 'Add Schedule',
        variant: (showEmptyState ? 'accent' : 'outline') as 'accent' | 'outline',
        icon: (
          <PlusCircleIcon
            size={24}
            className={showEmptyState ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}
          />
        ),
        onClick: handleAddSchedule,
      },
    ],
    [handleAddSchedule, showEmptyState],
  );

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout
      title="Scripts Schedules"
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      {showEmptyState ? (
        <EmptyState
          icon={<TimerIcon />}
          title="No scripts schedules yet"
          description="Scripts set to run automatically on a schedule (daily maintenance, weekly cleanups, monthly audits) will be displayed here."
          actions={[
            { icon: <HourglassClockIcon />, label: 'Run hourly, daily, weekly, or on custom cron' },
            { icon: <RadarIcon />, label: 'Target specific devices, Customers, or tags' },
            { icon: <ListBulletIcon />, label: 'View execution history and success rates' },
          ]}
          buttonLabel="Ask Mingo about Script Schedules"
          buttonIcon={
            <MingoIcon
              className="size-5"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          onButtonClick={() => askMingo('script-schedules')}
        />
      ) : (
        <div className="flex flex-col" style={containerStyle}>
          <div
            ref={toolbarRef}
            className="sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]"
          >
            <Input
              placeholder="Search for Schedule"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="flex-1"
              startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
            />
          </div>

          <DataTable table={table}>
            <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} rightSlot={<DataTable.RowCount />} />
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
        </div>
      )}
    </PageLayout>
  );
}
