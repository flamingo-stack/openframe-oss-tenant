'use client';

import { ViewToggle } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Filter02Icon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  FilterModal,
  PageError,
  PageLayout,
  Table,
  TagSearchInput,
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
import { getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns';

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

  const columns = useMemo(() => getDeviceTableColumns(deviceFilters ?? null), [deviceFilters]);
  const renderRowActions = useMemo(() => getDeviceTableRowActions(() => refetch()), [refetch]);

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
    columns,
    setParams,
  });

  const gridSentinelRef = useGridInfiniteScroll({
    enabled: params.viewMode === 'grid',
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const handleRowClick = useCallback(
    (device: Device) => {
      router.push(`/devices/details/${device.machineId || device.id}`);
    },
    [router],
  );

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout
      title="Devices"
      headerActions={
        <HeaderActions
          viewMode={params.viewMode}
          onViewModeChange={v => setParam('viewMode', v)}
          onAddDevice={() => router.push('/devices/new')}
        />
      }
      contentClassName="flex flex-col"
    >
      <div
        className={cn(
          'flex gap-[var(--spacing-system-m)] items-center',
          'sticky -top-4 md:-top-6 z-20 bg-ods-bg -mx-4 md:-mx-6 px-4 md:px-6 -mt-4 md:-mt-6 pt-4 md:pt-6 pb-2',
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

      {params.viewMode === 'table' ? (
        <Table
          data={devices}
          columns={columns}
          rowKey="machineId"
          loading={isLoading || isDeviceFiltersLoading}
          skeletonRows={10}
          emptyMessage="No devices found. Try adjusting your search or filters."
          onRowClick={handleRowClick}
          renderRowActions={renderRowActions}
          filters={tableFilters}
          onFilterChange={handleFilterChange}
          showFilters={true}
          rowClassName="mb-1"
          infiniteScroll={{
            hasNextPage,
            isFetchingNextPage,
            onLoadMore: () => fetchNextPage(),
            skeletonRows: 2,
          }}
          stickyHeader
          stickyHeaderOffset="top-[56px]"
        />
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
    </PageLayout>
  );
}

function HeaderActions({
  viewMode,
  onViewModeChange,
  onAddDevice,
}: {
  viewMode: string;
  onViewModeChange: (value: 'table' | 'grid') => void;
  onAddDevice: () => void;
}) {
  return (
    <>
      <ViewToggle
        value={viewMode as 'table' | 'grid'}
        onValueChange={onViewModeChange}
        className="bg-ods-card border border-ods-border h-12"
      />
      <Button
        variant={'card'}
        onClick={onAddDevice}
        leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
      >
        Add Device
      </Button>
    </>
  );
}
