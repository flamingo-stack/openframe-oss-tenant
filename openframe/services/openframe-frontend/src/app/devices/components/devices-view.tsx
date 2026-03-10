'use client';

import { ViewToggle } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { Button, ListPageLayout, Table } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_VISIBLE_STATUSES } from '../constants/device-statuses';
import { useDeviceFilters } from '../hooks/use-device-filters';
import { useDevices } from '../hooks/use-devices';
import type { Device } from '../types/device.types';
import { DevicesGrid } from './devices-grid';
import { getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns';

export function DevicesView() {
  const router = useRouter();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    statuses: { type: 'array', default: [] },
    osTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    viewMode: { type: 'string', default: 'table' },
  });

  const debouncedSearch = useDebounce(params.search, 300);

  // Backend filters from URL params (default excludes ARCHIVED and DELETED)
  const filters = useMemo(
    () => ({
      statuses: params.statuses.length > 0 ? params.statuses : DEFAULT_VISIBLE_STATUSES,
      osTypes: params.osTypes,
      organizationIds: params.organizationIds,
    }),
    [params.statuses, params.osTypes, params.organizationIds],
  );

  const { devices, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useDevices(
    filters,
    debouncedSearch,
  );

  const { data: deviceFilters } = useDeviceFilters(filters);

  const columns = useMemo(() => getDeviceTableColumns(deviceFilters ?? null), [deviceFilters]);

  // Refresh callback for after archive/delete actions
  const renderRowActions = useMemo(() => getDeviceTableRowActions(() => refetch()), [refetch]);

  // Navigate to device details on row click
  const handleRowClick = useCallback(
    (device: Device) => {
      const id = device.machineId || device.id;
      router.push(`/devices/details/${id}`);
    },
    [router],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        statuses: columnFilters.status || [],
        osTypes: columnFilters.os || [],
        organizationIds: columnFilters.organization || [],
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  // Convert URL params to table filters format
  const tableFilters = useMemo(
    () => ({
      status: params.statuses,
      os: params.osTypes,
      organization: params.organizationIds,
    }),
    [params.statuses, params.osTypes, params.organizationIds],
  );

  const viewToggle = (
    <>
      <ViewToggle
        value={params.viewMode as 'table' | 'grid'}
        onValueChange={value => setParam('viewMode', value)}
        className="bg-ods-card border border-ods-border h-12"
      />
      <Button
        onClick={() => router.push('/devices/new')}
        leftIcon={<PlusCircleIcon className="w-5 h-5" whiteOverlay />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
      >
        Add Device
      </Button>
    </>
  );

  const filterGroups = columns
    .filter(column => column.filterable)
    .map(column => ({
      id: column.key,
      title: column.label,
      options: column.filterOptions || [],
    }));

  const gridSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.viewMode !== 'grid' || !hasNextPage || isFetchingNextPage) return;
    const sentinel = gridSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [params.viewMode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <ListPageLayout
      title="Devices"
      headerActions={viewToggle}
      searchPlaceholder="Search for Devices"
      searchValue={params.search}
      onSearch={value => setParam('search', value)}
      error={error}
      padding="none"
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      currentMobileFilters={tableFilters}
      stickyHeader
    >
      {/* Conditional View Rendering */}
      {params.viewMode === 'table' ? (
        // Table View
        <Table
          data={devices}
          columns={columns}
          rowKey="machineId"
          loading={isLoading}
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
        // Grid View
        <DevicesGrid
          devices={devices}
          isLoading={isLoading}
          filters={filters}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={gridSentinelRef}
        />
      )}
    </ListPageLayout>
  );
}
