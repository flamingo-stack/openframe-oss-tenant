'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Table, 
  SearchBar, 
  Button,
  ListPageContainer,
  PageError
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon, GridViewIcon, TableViewIcon } from "@flamingo/ui-kit/components/icons"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { cn } from "@flamingo/ui-kit/utils"
import { useDevices } from '../hooks/use-devices'
import { Device } from '../types/device.types'
import { getDeviceTableColumns, getDeviceTableRowActions } from './devices-table-columns'
import { DevicesGrid } from './devices-grid'

export function DevicesView() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ statuses?: string[], deviceTypes?: string[], osTypes?: string[] }>({})
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  const { devices, deviceFilters, isLoading, error, searchDevices, refreshDevices } = useDevices(filters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const columns = useMemo(() => getDeviceTableColumns(deviceFilters), [deviceFilters])

  const handleDeviceMore = useCallback((device: Device) => {
    console.log('More clicked for device:', device.agent_id)
  }, [])

  const handleDeviceDetails = useCallback((device: Device) => {
    const machineId = device.machineId || device.agent_id
    router.push(`/devices/details/${machineId}`)
  }, [router])

  const rowActions = useMemo(
    () => getDeviceTableRowActions(handleDeviceMore, handleDeviceDetails),
    [handleDeviceMore, handleDeviceDetails]
  )

  React.useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      searchDevices(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchDevices])

  const handleRefresh = useCallback(() => {
    refreshDevices()
  }, [refreshDevices])
  
  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)
    
    const newFilters: any = {}
    
    if (columnFilters.status?.length > 0) {
      newFilters.statuses = columnFilters.status
    }
    
    if (columnFilters.type?.length > 0) {
      newFilters.deviceTypes = columnFilters.type
    }
    
    if (columnFilters.os?.length > 0) {
      newFilters.osTypes = columnFilters.os
    }
    
    setFilters(newFilters)
  }, [])

  if (error) {
    return <PageError message={error} />
  }

  const viewToggle = (
    <div className="flex items-center gap-2">
      <div className="flex bg-ods-card border border-ods-border rounded-[6px] p-1">
        <Button
          onClick={() => setViewMode('grid')}
          variant="ghost"
          className={cn(
            "p-2 rounded transition-all duration-200",
            viewMode === 'grid' 
              ? "bg-ods-accent-hover text-ods-text-on-accent" 
              : "text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-hover"
          )}
          aria-label="Grid view"
        >
          <GridViewIcon className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setViewMode('table')}
          variant="ghost"
          className={cn(
            "p-2 rounded transition-all duration-200",
            viewMode === 'table'
              ? "bg-ods-accent-hover text-ods-text-on-accent"
              : "text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-hover"
          )}
          aria-label="Table view"
        >
          <TableViewIcon className="w-5 h-5" />
        </Button>
      </div>
      
      <Button
        onClick={handleRefresh}
        leftIcon={<RefreshIcon size={20} />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
      >
        Refresh
      </Button>
    </div>
  )

  return (
    <ListPageContainer
      title="Devices"
      headerActions={viewToggle}
      padding="sm"
    >

      {/* Search */}
      <SearchBar
        placeholder="Search for Devices"
        onSubmit={setSearchTerm}
        value={searchTerm}
        className="w-full"
      />

      {/* Conditional View Rendering */}
      {viewMode === 'table' ? (
        // Table View
        <Table
          data={devices}
          columns={columns}
          rowKey="machineId"
          loading={isLoading}
          emptyMessage="No devices found. Try adjusting your search or filters."
          rowActions={rowActions}
          filters={tableFilters}
          onFilterChange={handleFilterChange}
          showFilters={true}
          mobileColumns={['device', 'status', 'lastSeen']}
          rowClassName="mb-1"
        />
      ) : (
        // Grid View
        <DevicesGrid
          devices={devices}
          isLoading={isLoading}
          filters={filters}
          onDeviceMore={handleDeviceMore}
          onDeviceDetails={handleDeviceDetails}
        />
      )}
    </ListPageContainer>
  )
}