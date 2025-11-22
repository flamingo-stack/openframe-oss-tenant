'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  Button,
  ListPageLayout
} from "@flamingo/ui-kit/components/ui"
import { PlusCircleIcon } from "@flamingo/ui-kit/components/icons"
import { ViewToggle } from "@flamingo/ui-kit/components/features"
import { useDebounce, useBatchImages, useTablePagination } from "@flamingo/ui-kit/hooks"
import { useDevices } from '../hooks/use-devices'
import { getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns'
import { DevicesGrid } from './devices-grid'
import { featureFlags } from '@lib/feature-flags'

export function DevicesView() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ statuses?: string[], deviceTypes?: string[], osTypes?: string[] }>({})
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  const { devices, deviceFilters, isLoading, error, searchDevices, pageInfo, fetchNextPage, fetchFirstPage, hasLoadedBeyondFirst } = useDevices(filters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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
    if (debouncedSearchTerm !== undefined) {
      searchDevices(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchDevices])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
    
    const newFilters: any = {}
    
    if (columnFilters.status?.length > 0) {
      newFilters.statuses = columnFilters.status
    }
    
    if (columnFilters.os?.length > 0) {
      newFilters.osTypes = columnFilters.os
    }
    
    if (columnFilters.organization?.length > 0) {
      newFilters.organizationIds = columnFilters.organization
    }
    
    setFilters(newFilters)
  }, [])

  const handleNextPage = useCallback(async () => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      await fetchNextPage(searchTerm)
    }
  }, [pageInfo, fetchNextPage, searchTerm])

  const handleResetToFirstPage = useCallback(async () => {
    await fetchFirstPage(searchTerm)
  }, [fetchFirstPage, searchTerm])

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


  const viewToggle = (
    <>
      <ViewToggle
        value={viewMode}
        onValueChange={setViewMode}
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
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      error={error}
      padding="none"
      className="pt-6"
    >
      {/* Conditional View Rendering */}
      {viewMode === 'table' ? (
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