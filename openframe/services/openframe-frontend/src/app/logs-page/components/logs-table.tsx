'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { LogTableRow, SearchBar, Button } from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { type FilterSection } from "@flamingo/ui-kit/components/features"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { useLogs } from '../hooks/use-logs'
import { TableHeader, type TableColumn } from './table-header'
import { MobileHeader } from './mobile-header'
import { TableRowSkeleton } from './table-row-skeleton'
import { EmptyState } from './empty-state'
import { LogInfoModal } from './log-info-modal'

export interface UILogEntry {
  id: string
  logId: string
  timestamp: string
  status: {
    label: string
    variant?: 'success' | 'warning' | 'error' | 'info' | 'critical'
  }
  source: {
    name: string
    icon?: React.ReactNode
  }
  device: {
    name: string
    organization?: string
  }
  description: {
    title: string
    details?: string
  }
  // Store original LogEntry for API calls
  originalLogEntry?: any
}

// Default columns configuration for logs table
const DEFAULT_COLUMNS: TableColumn[] = [
  { key: 'logId', label: 'Log ID', width: 'w-40' },
  { key: 'status', label: 'Status', width: 'w-32', filterable: true },
  { key: 'tool', label: 'Tool', width: 'w-40', filterable: true },
  { key: 'device', label: 'Device', width: 'w-40' },
  { key: 'details', label: 'Log Details', width: 'flex-1 min-w-0' }
]

interface LogsTableUIProps {
  logs: UILogEntry[]
  loading: boolean
  searchTerm: string
  onSearch: (searchTerm: string) => void
  onRefresh: () => void
  onMoreClick: (log: UILogEntry) => void
  onDetailsClick: (log: UILogEntry) => void
  fetchLogDetails: (logEntry: any) => Promise<any>
  onStatusFilterApply: (filters: Record<string, string[]>) => void
  onToolFilterApply: (filters: Record<string, string[]>) => void
  currentStatusFilters?: string[]
  currentToolFilters?: string[]
}

// Column-specific filter configurations
const STATUS_FILTER_SECTION: FilterSection = {
  id: 'status',
  title: 'Status',
  type: 'checkbox',
  options: [
    { id: 'ERROR', label: 'Error', value: 'ERROR' },
    { id: 'WARNING', label: 'Warning', value: 'WARNING' },
    { id: 'INFO', label: 'Info', value: 'INFO' },
    { id: 'SUCCESS', label: 'Success', value: 'SUCCESS' },
    { id: 'CRITICAL', label: 'Critical', value: 'CRITICAL' }
  ],
  allowSelectAll: true
}

const TOOL_FILTER_SECTION: FilterSection = {
  id: 'tool',
  title: 'Tool',
  type: 'checkbox',
  options: [
    { id: 'TACTICAL_RMM', label: 'Tactical RMM', value: 'TACTICAL_RMM' },
    { id: 'MESHCENTRAL', label: 'MeshCentral', value: 'MESHCENTRAL' },
    { id: 'FLEET_MDM', label: 'Fleet MDM', value: 'FLEET_MDM' },
    { id: 'AUTHENTIK', label: 'Authentik', value: 'AUTHENTIK' },
    { id: 'OPENFRAME', label: 'OpenFrame', value: 'OPENFRAME' },
    { id: 'SYSTEM', label: 'System', value: 'SYSTEM' }
  ],
  allowSelectAll: true
}

function LogsTableUI({ 
  logs, 
  loading, 
  searchTerm, 
  onSearch, 
  onRefresh, 
  onMoreClick, 
  onDetailsClick, 
  fetchLogDetails,
  onStatusFilterApply,
  onToolFilterApply,
  currentStatusFilters = [],
  currentToolFilters = []
}: LogsTableUIProps) {
  const [selectedLog, setSelectedLog] = useState<UILogEntry | null>(null)
  
  const handleClearSearch = useCallback(() => {
    onSearch("")
  }, [onSearch])

  const handleLogClick = useCallback((log: UILogEntry) => {
    setSelectedLog(log)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null)
  }, [])

  return (
    <div className="flex flex-col gap-4 bg-[#161616] p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-[#fafafa]">
          Logs
        </h1>
        <Button
          onClick={onRefresh}
          leftIcon={<RefreshIcon size={20} />}
          className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
        >
          Refresh
        </Button>
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Search for Logs"
        onSubmit={onSearch}
        value={searchTerm}
        className="w-full"
      />

      {/* Mobile Filter Headers */}
      <MobileHeader 
        columns={DEFAULT_COLUMNS}
        filterConfigs={{
          status: {
            sections: [STATUS_FILTER_SECTION],
            appliedFilters: { status: currentStatusFilters },
            onApply: onStatusFilterApply,
            onReset: () => onStatusFilterApply({ status: [] })
          },
          tool: {
            sections: [TOOL_FILTER_SECTION],
            appliedFilters: { tool: currentToolFilters },
            onApply: onToolFilterApply,
            onReset: () => onToolFilterApply({ tool: [] })
          }
        }}
      />

      {/* Table */}
      <div className="flex flex-col gap-1 w-full">
        {/* Desktop Header */}
        <TableHeader 
          columns={DEFAULT_COLUMNS} 
          filterConfigs={{
            status: {
              sections: [STATUS_FILTER_SECTION],
              appliedFilters: { status: currentStatusFilters },
              onApply: onStatusFilterApply,
              onReset: () => onStatusFilterApply({ status: [] })
            },
            tool: {
              sections: [TOOL_FILTER_SECTION],
              appliedFilters: { tool: currentToolFilters },
              onApply: onToolFilterApply,
              onReset: () => onToolFilterApply({ tool: [] })
            }
          }}
        />

        {/* Rows */}
        <div className="flex flex-col gap-1 w-full">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <TableRowSkeleton key={index} index={index} columns={DEFAULT_COLUMNS} />
            ))
          ) : logs.length === 0 ? (
            <EmptyState
              searchTerm={searchTerm}
              onClearSearch={handleClearSearch}
            />
          ) : (
            logs.map((log) => (
              <LogTableRow
                key={log.id}
                logId={log.logId}
                timestamp={log.timestamp}
                status={log.status}
                source={log.source}
                device={log.device}
                description={log.description}
                onMoreClick={() => onMoreClick(log)}
                onDetailsClick={() => onDetailsClick(log)}
                className="mb-1 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                onClick={() => handleLogClick(log)}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Log Info Modal */}
      <LogInfoModal
        isOpen={!!selectedLog}
        onClose={handleCloseModal}
        log={selectedLog}
        fetchLogDetails={fetchLogDetails}
      />
    </div>
  )
}

export function LogsTable() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ severities?: string[], toolTypes?: string[] }>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const prevFilterKeyRef = useRef<string | null>(null)
  
  // Pass filters to useLogs hook for API-based filtering
  const { logs, isLoading, error, searchLogs, refreshLogs, fetchLogDetails } = useLogs(filters)
  
  // Debounce search term to prevent API spam
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Initial load effect
  useEffect(() => {
    if (!isInitialized) {
      searchLogs('')
      setIsInitialized(true)
    }
  }, [isInitialized, searchLogs])

  // Search effect - only runs when debounced search term changes
  useEffect(() => {
    if (isInitialized && debouncedSearchTerm !== undefined) {
      searchLogs(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchLogs, isInitialized])
  
  // Filter effect - only runs when filters actually change
  useEffect(() => {
    if (isInitialized) {
      // Create a stable string representation of filters for comparison
      const filterKey = JSON.stringify({
        severities: filters.severities?.sort() || [],
        toolTypes: filters.toolTypes?.sort() || []
      })
      
      // Only refresh if filters actually changed (including first filter application)
      if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
        refreshLogs()
      }
      prevFilterKeyRef.current = filterKey
    }
  }, [filters, refreshLogs, isInitialized])

  const transformedLogs: UILogEntry[] = useMemo(() => {
    return logs.map((log) => ({
      id: log.toolEventId,
      logId: log.toolEventId,
      timestamp: new Date(log.timestamp).toLocaleString(),
      status: {
        label: log.severity,
        variant: log.severity === 'ERROR' ? 'error' :
                log.severity === 'WARNING' ? 'warning' :
                log.severity === 'INFO' ? 'info' : 'success'
      },
      source: {
        name: log.toolType
      },
      device: {
        name: log.deviceId || 'Unknown Device',
        // Note: Backend LogEntry doesn't have organizationId, using userId instead
        organization: log.userId || undefined
      },
      description: {
        title: log.summary || 'No summary available',
        details: log.details
      },
      // Include original LogEntry for API calls
      originalLogEntry: log
    }))
  }, [logs])

  // Optimized handlers with useCallback to prevent unnecessary re-renders
  const handleSearch = useCallback((searchTerm: string) => {
    setSearchTerm(searchTerm)
  }, [])

  const handleMoreClick = useCallback((log: UILogEntry) => {
    console.log('More clicked for log:', log.id)
  }, [])

  const handleDetailsClick = useCallback((log: UILogEntry) => {
    // Navigate to log details page with all required parameters
    const ingestDay = log.originalLogEntry?.ingestDay
    const toolType = log.originalLogEntry?.toolType
    const eventType = log.originalLogEntry?.eventType
    const timestamp = log.originalLogEntry?.timestamp
    router.push(`/log-details?id=${log.id}&ingestDay=${ingestDay}&toolType=${toolType}&eventType=${eventType}&timestamp=${encodeURIComponent(timestamp || '')}`)
  }, [router])

  const handleRefresh = useCallback(() => {
    refreshLogs()
  }, [refreshLogs])
  
  // Handle filter updates from dropdowns
  const handleStatusFilterApply = useCallback((appliedFilters: Record<string, string[]>) => {
    const statusValues = appliedFilters['status'] || []
    setFilters(prev => {
      const newSeverities = statusValues.length > 0 ? statusValues : undefined
      // Only update if actually changed
      if (JSON.stringify(prev.severities?.sort()) === JSON.stringify(newSeverities?.sort())) {
        return prev
      }
      return {
        ...prev,
        severities: newSeverities
      }
    })
  }, [])
  
  const handleToolFilterApply = useCallback((appliedFilters: Record<string, string[]>) => {
    const toolValues = appliedFilters['tool'] || []
    setFilters(prev => {
      const newToolTypes = toolValues.length > 0 ? toolValues : undefined
      // Only update if actually changed
      if (JSON.stringify(prev.toolTypes?.sort()) === JSON.stringify(newToolTypes?.sort())) {
        return prev
      }
      return {
        ...prev,
        toolTypes: newToolTypes
      }
    })
  }, [])

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    )
  }

  return (
    <LogsTableUI
      logs={transformedLogs}
      loading={isLoading}
      searchTerm={searchTerm}
      onSearch={handleSearch}
      onRefresh={handleRefresh}
      onMoreClick={handleMoreClick}
      onDetailsClick={handleDetailsClick}
      fetchLogDetails={fetchLogDetails}
      onStatusFilterApply={handleStatusFilterApply}
      onToolFilterApply={handleToolFilterApply}
      currentStatusFilters={filters.severities}
      currentToolFilters={filters.toolTypes}
    />
  )
}