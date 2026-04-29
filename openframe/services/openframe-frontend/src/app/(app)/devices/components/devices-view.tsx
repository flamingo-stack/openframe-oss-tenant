'use client';

import {
  Chevron02RightIcon,
  Filter02Icon,
  GridIcon,
  PlusCircleIcon,
  TableCellIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  FilterModal,
  type OnChangeFn,
  PageError,
  PageLayout,
  type Row,
  TabSelector,
  TagSearchInput,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useDeviceFilters } from '../hooks/use-device-filters';
import { useDevices } from '../hooks/use-devices';
import { useDevicesUrlParams } from '../hooks/use-devices-url-params';
import { useGridInfiniteScroll } from '../hooks/use-grid-infinite-scroll';
import { useTagFilterModal } from '../hooks/use-tag-filter-modal';
import type { Device } from '../types/device.types';
import { DevicesGrid } from './devices-grid';
import { getDeviceFilterColumns, getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns';

export function DevicesView() {
  const router = useRouter();

  const {
    params,
    setParam,
    setParams,
    localSearch,
    setLocalSearch,
    debouncedSearch,
    filters,
    tableFilters,
    tagOptions,
    handleFilterChange,
    handleTagRemove,
    handleClearAll,
    handleTagSubmit,
  } = useDevicesUrlParams();

  const { devices, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useDevices(
    filters,
    debouncedSearch,
  );

  const { data: deviceFilters, isLoading: isDeviceFiltersLoading } = useDeviceFilters(filters);

  const filterColumns = useMemo(() => getDeviceFilterColumns(deviceFilters ?? null), [deviceFilters]);
  const renderRowActions = useMemo(() => getDeviceTableRowActions(() => refetch()), [refetch]);

  const baseColumns = useMemo(() => getDeviceTableColumns(deviceFilters ?? null), [deviceFilters]);

  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(params.statuses.length > 0 ? [{ id: 'status', value: params.statuses }] : []),
      ...(params.osTypes.length > 0 ? [{ id: 'os', value: params.osTypes }] : []),
      ...(params.organizationIds.length > 0 ? [{ id: 'organization', value: params.organizationIds }] : []),
    ],
    [params.statuses, params.osTypes, params.organizationIds],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    updater => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      handleFilterChange(Object.fromEntries(next.map(f => [f.id, f.value as string[]])));
    },
    [columnFilters, handleFilterChange],
  );

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        cell: ({ row }: { row: Row<Device> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<Device> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              href={`/devices/details/${row.original.machineId || row.original.id}`}
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
    [baseColumns, renderRowActions],
  );

  const table = useDataTable<Device>({
    data: devices,
    columns,
    getRowId: (row: Device) => String(row.machineId ?? row.id),
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange,
  });

  const {
    isOpen: filterModalOpen,
    open: openFilterModal,
    close: closeFilterModal,
    isMdUp,
    filterGroups,
    tagFilterKeys,
    handleFilterChange: handleModalFilterChange,
    handleTagsChange: handleModalTagsChange,
    selectedTags,
  } = useTagFilterModal({
    tags: params.tags,
    deviceFilters: deviceFilters ?? null,
    columns: filterColumns,
    setParams,
  });

  const deviceRowHref = useCallback((device: Device) => `/devices/details/${device.machineId || device.id}`, []);

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const gridSentinelRef = useGridInfiniteScroll({
    enabled: params.viewMode === 'grid',
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <>
      <PageLayout
        title="Devices"
        actionsVariant="icon-buttons"
        className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
        selector={
          <TabSelector
            value={params.viewMode}
            onValueChange={v => setParam('viewMode', v as 'table' | 'grid')}
            items={[
              { id: 'table', icon: <TableCellIcon className="w-6 h-6" /> },
              { id: 'grid', icon: <GridIcon className="w-6 h-6" /> },
            ]}
          />
        }
        actions={[
          {
            label: 'Add Device',
            onClick: () => router.push('/devices/new'),
            icon: <PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />,
            variant: 'card',
          },
        ]}
        contentClassName="flex flex-col"
      >
        <div>
          <div
            className={cn(
              'sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center',
              'bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]',
            )}
          >
            <div className="flex-1 min-w-0">
              <TagSearchInput
                tags={tagOptions}
                searchValue={localSearch}
                onSearchChange={setLocalSearch}
                onTagRemove={handleTagRemove}
                onClearAll={handleClearAll}
                onSubmit={handleTagSubmit}
                placeholder="Search for Devices"
                addMorePlaceholder="Add More..."
              />
            </div>
            {isMdUp ? (
              <Button
                variant="card"
                onClick={openFilterModal}
                leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
                className="shrink-0"
              >
                Filter Tags
              </Button>
            ) : (
              <Button
                variant="card"
                size="icon"
                onClick={openFilterModal}
                centerIcon={<Filter02Icon className="text-ods-text-secondary" />}
                className="shrink-0"
              />
            )}
          </div>

          {params.viewMode === 'table' ? (
            <DataTable table={table}>
              <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" rightSlot={<DataTable.RowCount />} />
              <DataTable.Body
                loading={isLoading || isDeviceFiltersLoading}
                skeletonRows={10}
                emptyMessage="No devices found. Try adjusting your search or filters."
                rowHref={deviceRowHref}
                rowClassName="mb-1"
              />
              <DataTable.InfiniteFooter
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleLoadMore}
                skeletonRows={2}
              />
            </DataTable>
          ) : (
            <DevicesGrid
              devices={devices}
              isLoading={isLoading}
              filters={filters}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              sentinelRef={gridSentinelRef}
            />
          )}
        </div>
      </PageLayout>

      <FilterModal
        isOpen={filterModalOpen}
        onClose={closeFilterModal}
        filterGroups={filterGroups}
        onFilterChange={handleModalFilterChange}
        currentFilters={!isMdUp ? tableFilters : undefined}
        tagFilterKeys={tagFilterKeys}
        selectedTags={selectedTags}
        onTagsChange={handleModalTagsChange}
        isLoading={isDeviceFiltersLoading}
        className="max-w-[600px]"
      />
    </>
  );
}
