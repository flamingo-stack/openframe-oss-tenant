'use client'

import React, { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Table, 
  SearchBar, 
  Button
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
    router.push(`/devices/details?id=${device.agent_id}`)
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
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-[#fafafa]">
          Devices
        </h1>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-[#212121] border border-[#3a3a3a] rounded-[6px] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded transition-all duration-200",
                viewMode === 'grid' 
                  ? "bg-[#FFD951] text-[#212121]" 
                  : "text-[#888888] hover:text-[#fafafa] hover:bg-[#2a2a2a]"
              )}
              aria-label="Grid view"
            >
              <GridViewIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded transition-all duration-200",
                viewMode === 'table'
                  ? "bg-[#FFD951] text-[#212121]"
                  : "text-[#888888] hover:text-[#fafafa] hover:bg-[#2a2a2a]"
              )}
              aria-label="Table view"
            >
              <TableViewIcon className="w-5 h-5" />
            </button>
          </div>

          <Button
            onClick={handleRefresh}
            leftIcon={<RefreshIcon size={20} />}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
          >
            Refresh
          </Button>
        </div>
      </div>

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
          rowKey="agent_id"
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
    </div>
  )
}