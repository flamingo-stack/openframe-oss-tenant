'use client'

import { ViewToggle } from "@flamingo-stack/openframe-frontend-core/components/features"
import { PlusCircleIcon } from "@flamingo-stack/openframe-frontend-core/components/icons"
import {
  Button,
  ListPageLayout,
  Table
} from "@flamingo-stack/openframe-frontend-core/components/ui"
import { useApiParams, useBatchImages, useCursorPaginationState, useTablePagination } from "@flamingo-stack/openframe-frontend-core/hooks"
import { featureFlags } from '@lib/feature-flags'
import { useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"
import { DEFAULT_VISIBLE_STATUSES } from '../constants/device-statuses'
import { useDevices } from '../hooks/use-devices'
import { type Device } from '../types/device.types'
import { DevicesGrid } from './devices-grid'
import { getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns'

export function DevicesView() {
  const router = useRouter()

  // Extra URL params not handled by cursor pagination hook (viewMode and filters)
  const { params: extraParams, setParam: setExtraParam, setParams: setExtraParams } = useApiParams({
    statuses: { type: 'array', default: [] },
    osTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    viewMode: { type: 'string', default: 'table' }
  })

  // Backend filters from URL params (default excludes ARCHIVED and DELETED)
  const filters = useMemo(() => ({
    statuses: extraParams.statuses.length > 0 ? extraParams.statuses : DEFAULT_VISIBLE_STATUSES,
    osTypes: extraParams.osTypes,
    organizationIds: extraParams.organizationIds
  }), [extraParams.statuses, extraParams.osTypes, extraParams.organizationIds])

  const { devices, deviceFilters, isLoading, error, searchDevices, pageInfo, fetchNextPage, fetchFirstPage, hasLoadedBeyondFirst, setHasLoadedBeyondFirst, fetchDevices, fetchDeviceFilters, markInitialLoadDone } = useDevices(filters)

  // Unified cursor pagination state management (no prefix, uses 'search' and 'cursor')
  const {
    searchInput,
    setSearchInput,
    hasLoadedBeyondFirst: hookHasLoadedBeyondFirst,
    handleNextPage,
    handleResetToFirstPage,
    params: paginationParams,
    setParams: setPaginationParams
  } = useCursorPaginationState({
    onInitialLoad: (search, cursor) => {
      if (cursor) {
        fetchDevices(search, cursor)
        setHasLoadedBeyondFirst(true)
      } else {
        fetchDevices(search)
      }
      fetchDeviceFilters()
      markInitialLoadDone()
    },
    onSearchChange: (search) => searchDevices(search)
  })

  const organizationImageUrls = useMemo(() =>
    featureFlags.organizationImages.displayEnabled()
      ? devices.map(device => device.organizationImageUrl).filter(Boolean)
      : [],
    [devices]
  )
  const fetchedImageUrls = useBatchImages(organizationImageUrls)

  const columns = useMemo(() => getDeviceTableColumns(deviceFilters, fetchedImageUrls), [deviceFilters, fetchedImageUrls])

  // Refresh callback for after archive/delete actions
  const refreshDevices = useCallback(() => {
    fetchDevices(paginationParams.search)
  }, [fetchDevices, paginationParams.search])

  const renderRowActions = useMemo(
    () => getDeviceTableRowActions(refreshDevices),
    [refreshDevices]
  )

  // Navigate to device details on row click
  const handleRowClick = useCallback((device: Device) => {
    const id = device.machineId || device.id
    router.push(`/devices/details/${id}`)
  }, [router])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Reset cursor and update filter params
    setPaginationParams({ cursor: '' })
    setExtraParams({
      statuses: columnFilters.status || [],
      osTypes: columnFilters.os || [],
      organizationIds: columnFilters.organization || []
    })
    setHasLoadedBeyondFirst(false)
  }, [setExtraParams, setPaginationParams, setHasLoadedBeyondFirst])

  const onNext = useCallback(async () => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      await handleNextPage(pageInfo.endCursor, () => fetchNextPage(paginationParams.search))
    }
  }, [pageInfo, handleNextPage, fetchNextPage, paginationParams.search])

  const onReset = useCallback(async () => {
    await handleResetToFirstPage(() => fetchFirstPage(paginationParams.search))
  }, [handleResetToFirstPage, fetchFirstPage, paginationParams.search])

  const cursorPagination = useTablePagination(
    pageInfo ? {
      type: 'server',
      hasNextPage: pageInfo.hasNextPage,
      hasLoadedBeyondFirst: hasLoadedBeyondFirst || hookHasLoadedBeyondFirst,
      startCursor: pageInfo.startCursor,
      endCursor: pageInfo.endCursor,
      itemCount: devices.length,
      itemName: 'devices',
      onNext,
      onReset,
      showInfo: true
    } : null
  )

  // Convert URL params to table filters format
  const tableFilters = useMemo(() => ({
    status: extraParams.statuses,
    os: extraParams.osTypes,
    organization: extraParams.organizationIds
  }), [extraParams.statuses, extraParams.osTypes, extraParams.organizationIds])

  const viewToggle = (
    <>
      <ViewToggle
        value={extraParams.viewMode as 'table' | 'grid'}
        onValueChange={(value) => setExtraParam('viewMode', value)}
        className="bg-ods-card border border-ods-border h-12"
      />
      <Button
        onClick={() => router.push('/devices/new')}
        leftIcon={<PlusCircleIcon className="w-5 h-5" whiteOverlay/>}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
      >
        Add Device
      </Button>
    </>
  )

  const filterGroups = columns.filter(column => column.filterable).map(column => ({
    id: column.key,
    title: column.label,
    options: column.filterOptions || []
  }))

  return (
    <ListPageLayout
      title="Devices"
      headerActions={viewToggle}
      searchPlaceholder="Search for Devices"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      padding="none"
      className="pt-6"
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      currentMobileFilters={tableFilters}
    >
      {/* Conditional View Rendering */}
      {extraParams.viewMode === 'table' ? (
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
          cursorPagination={cursorPagination}
        />
      ) : (
        // Grid View
        <DevicesGrid
          devices={devices}
          isLoading={isLoading}
          filters={filters}
        />
      )}
    </ListPageLayout>
  )
}