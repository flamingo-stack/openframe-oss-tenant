'use client';

import { Filter02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  FilterModal,
  type OnChangeFn,
  PageError,
  type Row,
  SearchInput,
  TagSearchInput,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useMemo } from 'react';
import { DevicesGrid } from '@/app/(app)/devices/components/devices-grid';
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
import { DeviceSelector, type InfiniteScrollConfig } from '@/app/components/shared/device-selector';

export type DevicesListInfiniteScroll = InfiniteScrollConfig;

export interface DevicesListSelection {
  /** Set of currently selected device keys. Controlled. */
  selectedIds: Set<string>;
  /** Called when selection changes. */
  onSelectionChange: (ids: Set<string>) => void;
  /** Extract the unique string key for selection from a device. Return undefined to exclude. */
  getDeviceKey: (device: Device) => string | undefined;
  /** Allow only one device to be selected at a time. */
  singleSelect?: boolean;
  /** Return a tooltip string if the device should be disabled, or undefined if enabled. */
  isDeviceDisabled?: (device: Device) => string | undefined;
  /** "replace" replaces entire selection on Add All; "merge" adds to existing. */
  addAllBehavior?: 'merge' | 'replace';
  /** Disable all interactions (e.g. during save). */
  disabled?: boolean;
}

export type DevicesListColumnId = 'device' | 'status' | 'os' | 'organization';

export interface DevicesListProps {
  /** Filters that are always applied (e.g. customer scope). Merged with user-driven filters. */
  baseFilters?: DeviceFilterInput;
  /** Column ids to drop from the default registry (e.g. 'organization' in customer-scoped views). */
  hideColumns?: DevicesListColumnId[];
  /** Extra column inserted before the open-in-new-tab column (row actions menu). Pass null to disable the default refresh menu. */
  actionsColumn?: ColumnDef<Device> | null;
  /** Enable rendering the grid view when `viewMode=grid` URL param is set. The toggle UI itself is rendered separately via `<DevicesViewModeToggle />`. */
  enableGrid?: boolean;
  /** Sticky offset for the table header (depends on surrounding chrome). */
  stickyHeaderOffset?: string;
  /** Trailing slot next to the search input — defaults to the Device Tags filter button. Pass null to hide. */
  searchTrailing?: React.ReactNode | null;
  /** Pixel padding around the sticky search row. Defaults to the standard page padding. */
  stickyContainerClassName?: string;
  /** Empty-state message override. */
  emptyMessage?: string;
  /**
   * Selector mode — when provided, the list becomes a controlled picker.
   * Replaces internal URL state and useDevices with `externalData`; the
   * action column becomes a +/check/trash toggle. Optional Available /
   * Selected tabs and Add All controls.
   */
  selection?: DevicesListSelection;
  /**
   * External device data source. Required when `selection` is set — selector
   * consumers fetch their own (often with custom platform/status filters).
   */
  externalData?: {
    devices: Device[];
    isLoading: boolean;
    infiniteScroll?: DevicesListInfiniteScroll;
  };
  /** Header slot rendered above the search row in selector mode (e.g. ScheduleInfoBar). */
  selectorHeaderContent?: React.ReactNode;
  /** Show Select Specific / By Criteria radio above tabs (selector mode only). */
  selectorShowSelectionModeRadio?: boolean;
}

/**
 * Reusable devices list. Two modes:
 * - **List mode** (default): URL-synced filters/search, infinite scroll,
 *   filter modal, action menu, navigates to /devices/details on row click.
 *   Powers /devices and customer-tab.
 * - **Selector mode** (`selection` + `externalData`): controlled selection,
 *   external data, +/check row buttons, optional Available/Selected tabs and
 *   Add All. Powers test script modal, run script, schedule, monitoring
 *   policy/query/check.
 *
 * Both modes share the same column factory (`getDeviceTableColumns`) so the
 * device/status/os/customer cells look identical across surfaces.
 */
export function DevicesList(props: DevicesListProps) {
  if (props.selection && props.externalData) {
    const { selection, externalData } = props;
    return (
      <DeviceSelector
        devices={externalData.devices}
        loading={externalData.isLoading}
        selectedIds={selection.selectedIds}
        onSelectionChange={selection.onSelectionChange}
        getDeviceKey={selection.getDeviceKey}
        singleSelect={selection.singleSelect}
        isDeviceDisabled={selection.isDeviceDisabled}
        addAllBehavior={selection.addAllBehavior}
        disabled={selection.disabled}
        showSelectionModeRadio={props.selectorShowSelectionModeRadio ?? false}
        headerContent={props.selectorHeaderContent}
        infiniteScroll={externalData.infiniteScroll}
      />
    );
  }

  return <DevicesListListMode {...props} />;
}

function DevicesListListMode({
  baseFilters,
  hideColumns,
  actionsColumn,
  enableGrid = false,
  stickyHeaderOffset = 'top-[96px]',
  searchTrailing,
  stickyContainerClassName,
  emptyMessage = 'No devices found. Try adjusting your search or filters.',
}: DevicesListProps) {
  const {
    params,
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

  const mergedFilters = useMemo<DeviceFilterInput>(
    () => (baseFilters ? { ...filters, ...baseFilters } : filters),
    [filters, baseFilters],
  );

  const { devices, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useDevices(
    mergedFilters,
    debouncedSearch,
  );

  const { data: deviceFilters, isLoading: isDeviceFiltersLoading } = useDeviceFilters(mergedFilters);

  const filterColumns = useMemo(() => {
    const all = getDeviceFilterColumns(deviceFilters ?? null);
    return hideColumns?.length ? all.filter(c => !hideColumns.includes(c.key as DevicesListColumnId)) : all;
  }, [deviceFilters, hideColumns]);

  const renderRowActions = useMemo(() => getDeviceTableRowActions(() => refetch()), [refetch]);

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

  const resolvedActionsColumn = useMemo<ColumnDef<Device> | undefined>(() => {
    if (actionsColumn === null) return undefined;
    if (actionsColumn) return actionsColumn;
    return {
      id: 'actions',
      cell: ({ row }: { row: Row<Device> }) => (
        <div
          data-no-row-click
          className="flex gap-[var(--spacing-system-s)] items-center justify-end pointer-events-auto"
        >
          {renderRowActions(row.original)}
        </div>
      ),
      enableSorting: false,
      meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
    };
  }, [actionsColumn, renderRowActions]);

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

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const gridSentinelRef = useGridInfiniteScroll({
    enabled: enableGrid && params.viewMode === 'grid',
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (error) {
    return <PageError message={error} />;
  }

  const defaultFilterButton = isMdUp ? (
    <Button
      variant="outline"
      onClick={openFilterModal}
      leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
      className="shrink-0"
    >
      Device Tags
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon"
      onClick={openFilterModal}
      leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
      className="shrink-0"
    />
  );

  const trailingSlot = searchTrailing === null ? null : (searchTrailing ?? defaultFilterButton);

  return (
    <>
      <div
        className={cn(
          'sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center bg-ods-bg',
          stickyContainerClassName ??
            '-mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]',
        )}
      >
        <div className="flex-1 min-w-0">
          {trailingSlot ? (
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
          ) : (
            <SearchInput value={localSearch} onChange={setLocalSearch} placeholder="Search for Devices" />
          )}
        </div>
        {trailingSlot}
      </div>

      {enableGrid && params.viewMode === 'grid' ? (
        <DevicesGrid
          devices={devices}
          isLoading={isLoading}
          filters={mergedFilters}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={gridSentinelRef}
        />
      ) : (
        <DevicesTableBody
          devices={devices}
          isLoading={isLoading || isDeviceFiltersLoading}
          emptyMessage={emptyMessage}
          skeletonRows={10}
          stickyHeaderOffset={stickyHeaderOffset}
          deviceFilters={deviceFilters ?? null}
          columnFilters={columnFilters}
          onColumnFiltersChange={onColumnFiltersChange}
          actionsColumn={resolvedActionsColumn}
          hideColumns={hideColumns}
          footerSlot={
            <DataTable.InfiniteFooter
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              skeletonRows={2}
            />
          }
        />
      )}

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
