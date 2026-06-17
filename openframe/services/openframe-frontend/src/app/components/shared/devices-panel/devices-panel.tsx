'use client';

import { GridIcon, PlusCircleIcon, TableCellIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  type OnChangeFn,
  PageError,
  PageLayout,
  type Row,
  TabSelector,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';
import { DevicesGrid } from '@/app/(app)/devices/components/devices-grid';
import { DevicesGridFilters } from '@/app/(app)/devices/components/devices-grid-filters';
import {
  DevicesTableBody,
  getDeviceFilterColumns,
  getDeviceTableRowActions,
} from '@/app/(app)/devices/components/devices-table-columns';
import { useDeviceFilters } from '@/app/(app)/devices/hooks/use-device-filters';
import { useDevices } from '@/app/(app)/devices/hooks/use-devices';
import { useDevicesUrlParams } from '@/app/(app)/devices/hooks/use-devices-url-params';
import { useGridInfiniteScroll } from '@/app/(app)/devices/hooks/use-grid-infinite-scroll';
import { useTagFilterModal } from '@/app/(app)/devices/hooks/use-tag-filter-modal';
import type { Device, DeviceFilterInput } from '@/app/(app)/devices/types/device.types';
import { DevicesFilterToolbar } from '../devices-filter-toolbar';

export interface DevicesPanelProps {
  /** Page title shown in the PageLayout header. */
  title?: string;
  /** Destination of the "Add Device" button. */
  addDeviceHref?: string;
  /** Filters merged on top of URL-driven filters (e.g. lock to a single organization). */
  lockedFilters?: Partial<DeviceFilterInput>;
  /** Column ids to drop from the table (e.g. 'organization' when scoped to one org). */
  hideColumns?: string[];
  /** Filter keys to drop from the FilterModal (e.g. 'organization' when scoped to one org). */
  hideFilters?: string[];
  /**
   * Default statuses applied when the user hasn't picked any. Pass `[]` to disable
   * the default and return devices of all statuses (e.g. when scoped to one customer).
   */
  defaultStatuses?: string[];
  /**
   * Overrides the PageLayout wrapper className. Pass an empty string to disable
   * the default side/bottom padding (e.g. when embedded inside a tab whose parent
   * already provides padding).
   */
  className?: string;
  /**
   * Empty state rendered instead of the toolbar + list when there are
   * no devices and no active search/filters. Pass from the standalone Devices
   * page; omit in embedded contexts to keep the inline "no results" message.
   */
  emptyState?: ReactNode;
}

export function DevicesPanel({
  title = 'Devices',
  addDeviceHref = '/devices/new',
  lockedFilters,
  hideColumns,
  hideFilters,
  defaultStatuses,
  className = '',
  emptyState,
}: DevicesPanelProps) {
  const router = useRouter();

  const {
    params,
    setParam,
    setParams,
    localSearch,
    setLocalSearch,
    debouncedSearch,
    filters: urlFilters,
    effectiveStatuses,
    tableFilters,
    tagOptions,
    handleFilterChange,
    handleTagRemove,
    handleClearAll,
    handleTagSubmit,
  } = useDevicesUrlParams({ defaultStatuses });

  const filters = useMemo<DeviceFilterInput>(() => ({ ...urlFilters, ...lockedFilters }), [urlFilters, lockedFilters]);

  const { devices, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch, filteredCount } =
    useDevices(filters, debouncedSearch);

  const { data: deviceFilters, isLoading: isDeviceFiltersLoading } = useDeviceFilters(filters);

  const hasActiveDeviceFilters =
    params.statuses.length > 0 ||
    params.osTypes.length > 0 ||
    params.organizationIds.length > 0 ||
    params.tags.length > 0;

  // Pristine, genuinely-empty view (no search, no filters, no devices): show the
  // empty state instead of the toolbar + list, when one is provided.
  const showEmptyState =
    !!emptyState && !isLoading && !debouncedSearch && !hasActiveDeviceFilters && devices.length === 0;

  const filterColumns = useMemo(() => {
    const hidden = new Set(hideFilters ?? []);
    return getDeviceFilterColumns(deviceFilters ?? null).filter(c => !hidden.has(c.key));
  }, [deviceFilters, hideFilters]);
  const renderRowActions = useMemo(() => getDeviceTableRowActions(() => refetch()), [refetch]);

  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(effectiveStatuses.length > 0 ? [{ id: 'status', value: effectiveStatuses }] : []),
      ...(params.osTypes.length > 0 ? [{ id: 'os', value: params.osTypes }] : []),
      ...(params.organizationIds.length > 0 ? [{ id: 'organization', value: params.organizationIds }] : []),
    ],
    [effectiveStatuses, params.osTypes, params.organizationIds],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    updater => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      handleFilterChange(Object.fromEntries(next.map(f => [f.id, f.value as string[]])));
    },
    [columnFilters, handleFilterChange],
  );

  const actionsColumn = useMemo<ColumnDef<Device>>(
    () => ({
      id: 'actions',
      cell: ({ row }: { row: Row<Device> }) => (
        <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
          {renderRowActions(row.original)}
        </div>
      ),
      enableSorting: false,
      meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
    }),
    [renderRowActions],
  );

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

  // Grid layout is desktop-only — force-collapse to table on mobile so the
  // user always gets a usable list at narrow widths.
  useEffect(() => {
    if (!isMdUp && params.viewMode === 'grid') {
      setParam('viewMode', 'table');
    }
  }, [isMdUp, params.viewMode, setParam]);

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
        title={title}
        actionsVariant="icon-buttons"
        className={className}
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
            onClick: () => router.push(addDeviceHref),
            icon: (
              <PlusCircleIcon
                className={`w-5 h-5 ${showEmptyState ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}`}
              />
            ),
            variant: showEmptyState ? 'accent' : 'outline',
          },
        ]}
        contentClassName="flex flex-col"
      >
        {showEmptyState ? (
          emptyState
        ) : (
          <div>
            <DevicesFilterToolbar
              searchValue={localSearch}
              onSearchChange={setLocalSearch}
              tags={tagOptions}
              onTagRemove={handleTagRemove}
              onClearAll={handleClearAll}
              onSubmit={handleTagSubmit}
              isMdUp={isMdUp}
              onOpenFilterModal={openFilterModal}
              isFilterModalOpen={filterModalOpen}
              onCloseFilterModal={closeFilterModal}
              filterGroups={filterGroups}
              onFilterChange={handleModalFilterChange}
              currentFilters={!isMdUp ? tableFilters : undefined}
              tagFilterKeys={tagFilterKeys}
              selectedTags={selectedTags}
              onTagsChange={handleModalTagsChange}
              isLoading={isDeviceFiltersLoading}
            />
            {params.viewMode === 'table' ? (
              <DevicesTableBody
                devices={devices}
                isLoading={isLoading || isDeviceFiltersLoading}
                emptyMessage="No devices found. Try adjusting your search or filters."
                skeletonRows={10}
                stickyHeaderOffset="top-[96px]"
                deviceFilters={deviceFilters ?? null}
                columnFilters={columnFilters}
                onColumnFiltersChange={onColumnFiltersChange}
                actionsColumn={actionsColumn}
                hideColumns={hideColumns}
                totalCount={filteredCount}
                footerSlot={
                  <DataTable.InfiniteFooter
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={handleLoadMore}
                    skeletonRows={2}
                  />
                }
              />
            ) : (
              <>
                <DevicesGridFilters
                  filterColumns={filterColumns}
                  currentFilters={tableFilters}
                  onFilterChange={handleFilterChange}
                  totalCount={filteredCount}
                />
                <DevicesGrid
                  devices={devices}
                  isLoading={isLoading}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  sentinelRef={gridSentinelRef}
                />
              </>
            )}
          </div>
        )}
      </PageLayout>
    </>
  );
}
