'use client'

import React, { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout
} from "@flamingo/ui-kit/components/ui"
import { PlusCircleIcon } from "@flamingo/ui-kit/components/icons"
import { ViewToggle } from "@flamingo/ui-kit/components/features"
import { useDebounce, useBatchImages, useTablePagination, useApiParams } from "@flamingo/ui-kit/hooks"
import { useDevices } from '../hooks/use-devices'
import { getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns'
import { DevicesGrid } from './devices-grid'
import { featureFlags } from '@lib/feature-flags'

export function DevicesView() {
  const router = useRouter()

  // URL state management - search, filters, and pagination persist in URL
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    statuses: { type: 'array', default: [] },
    osTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    viewMode: { type: 'string', default: 'table' },
    cursor: { type: 'string', default: '' }
  })

  // Debounce search input for smoother UX
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearchInput = useDebounce(searchInput, 300)

  // Update URL when debounced input changes
  useEffect(() => {
    setParam('search', debouncedSearchInput)
  }, [debouncedSearchInput])

  // Backend filters from URL params
  const filters = useMemo(() => ({
    statuses: params.statuses,
    osTypes: params.osTypes,
    organizationIds: params.organizationIds
  }), [params.statuses, params.osTypes, params.organizationIds])

  const { devices, deviceFilters, isLoading, error, searchDevices, pageInfo, fetchNextPage, fetchFirstPage, hasLoadedBeyondFirst } = useDevices(filters)

  const organizationImageUrls = useMemo(() => 
    featureFlags.organizationImages.displayEnabled()
      ? devices.map(device => device.organizationImageUrl).filter(Boolean)
      : [], 
    [devices]
  )
  const fetchedImageUrls = useBatchImages(organizationImageUrls)

  const columns = useMemo(() => getDeviceTableColumns(deviceFilters, fetchedImageUrls), [deviceFilters, fetchedImageUrls])

  const renderRowActions = useMemo(
    () => getDeviceTableRowActions(),
    []
  )

  React.useEffect(() => {
    if (params.search !== undefined) {
      searchDevices(params.search)
    }
  }, [params.search])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Batch update all params at once - single router.replace call
    setParams({
      cursor: '', // Reset cursor when filters change
      statuses: columnFilters.status || [],
      osTypes: columnFilters.os || [],
      organizationIds: columnFilters.organization || []
    })
  }, [setParams])

  const handleNextPage = useCallback(async () => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      setParam('cursor', pageInfo.endCursor)
      await fetchNextPage(params.search)
    }
  }, [pageInfo, fetchNextPage, params.search, setParam])

  const handleResetToFirstPage = useCallback(async () => {
    setParam('cursor', '')
    await fetchFirstPage(params.search)
  }, [fetchFirstPage, params.search, setParam])

  const cursorPagination = useTablePagination(
    pageInfo ? {
      type: 'server',
      hasNextPage: pageInfo.hasNextPage,
      hasLoadedBeyondFirst,
      startCursor: pageInfo.startCursor,
      endCursor: pageInfo.endCursor,
      itemCount: devices.length,
      itemName: 'devices',
      onNext: handleNextPage,
      onReset: handleResetToFirstPage,
      showInfo: true
    } : null
  )


  // Convert URL params to table filters format
  const tableFilters = useMemo(() => ({
    status: params.statuses,
    os: params.osTypes,
    organization: params.organizationIds
  }), [params.statuses, params.osTypes, params.organizationIds])

  const viewToggle = (
    <>
      <ViewToggle
        value={params.viewMode as 'table' | 'grid'}
        onValueChange={(value) => setParam('viewMode', value)}
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
    >
      {/* Conditional View Rendering */}
      {params.viewMode === 'table' ? (
        // Table View
        <Table
          data={devices}
          columns={columns}
          rowKey="machineId"
          loading={isLoading}
          emptyMessage="No devices found. Try adjusting your search or filters."
          renderRowActions={renderRowActions}
          filters={tableFilters}
          onFilterChange={handleFilterChange}
          showFilters={true}
          mobileColumns={['device', 'status', 'lastSeen']}
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