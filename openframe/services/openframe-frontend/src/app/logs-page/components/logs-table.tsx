'use client'

import { Input, ToolBadge } from "@flamingo-stack/openframe-frontend-core"
import { Refresh02HrIcon } from "@flamingo-stack/openframe-frontend-core/components/icons-v2"
import {
  Button,
  DeviceCardCompact,
  ListPageLayout,
  StatusTag,
  Table,
  TableDescriptionCell,
  TableTimestampCell,
  type TableColumn
} from "@flamingo-stack/openframe-frontend-core/components/ui"
import { useApiParams, useCursorPaginationState, useTablePagination } from "@flamingo-stack/openframe-frontend-core/hooks"
import { normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils'
import { transformOrganizationFilters } from '@lib/filter-utils'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { useLogFilters, useLogs } from '../hooks/use-logs'
import { LogInfoModal } from './log-info-modal'

interface UILogEntry {
  id: string
  logId: string
  timestamp: string
  status: {
    label: string
    variant?: 'success' | 'warning' | 'error' | 'info' | 'critical'
  }
  source: {
    name: string
    toolType: string
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

interface LogsTableProps {
  deviceId?: string
  embedded?: boolean
}

export interface LogsTableRef {
  refresh: () => void
}

export const LogsTable = forwardRef<LogsTableRef, LogsTableProps>(function LogsTable({ deviceId, embedded = false }: LogsTableProps = {}, ref) {
 
  // Extra URL params for filters (not search/cursor which are handled by pagination hook)
  const { params: filterParams, setParams: setFilterParams } = useApiParams({
    severities: { type: 'array', default: [] },
    toolTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] }
  })

  const [selectedLog, setSelectedLog] = useState<UILogEntry | null>(null)
  const prevFiltersKeyRef = useRef<string | null>(null)

  const { logFilters, fetchLogFilters } = useLogFilters()

  const backendFilters = useMemo(() => {
    return {
      severities: filterParams.severities,
      toolTypes: filterParams.toolTypes,
      organizationIds: filterParams.organizationIds,
      deviceId: deviceId
    }
  }, [filterParams.severities, filterParams.toolTypes, filterParams.organizationIds, deviceId])

  // Stable filter key for detecting changes
  const filtersKey = useMemo(() => JSON.stringify({
    severities: filterParams.severities?.sort() || [],
    toolTypes: filterParams.toolTypes?.sort() || [],
    organizationIds: filterParams.organizationIds?.sort() || [],
    deviceId: deviceId || null
  }), [filterParams.severities, filterParams.toolTypes, filterParams.organizationIds, deviceId])

  const {
    logs,
    pageInfo,
    isLoading,
    error,
    searchLogs,
    refreshLogs,
    fetchLogDetails,
    fetchNextPage,
    fetchFirstPage,
    hasNextPage,
    fetchLogs
  } = useLogs(backendFilters)

  // Unified cursor pagination state management (no prefix)
  const {
    searchInput,
    setSearchInput,
    hasLoadedBeyondFirst,
    setHasLoadedBeyondFirst,
    handleNextPage,
    handleResetToFirstPage,
    params: paginationParams,
    setParams: setPaginationParams
  } = useCursorPaginationState({
    onInitialLoad: (search, cursor) => {
      if (cursor) {
        fetchLogs(search || '', backendFilters, cursor, false)
        setHasLoadedBeyondFirst(true)
      } else {
        searchLogs(search || '')
      }
      fetchLogFilters()
    },
    onSearchChange: (search) => searchLogs(search)
  })

  // Transform API logs to UI format
  const transformedLogs: UILogEntry[] = useMemo(() => {
    return logs.map((log) => {
      return {
        id: log.toolEventId,
        logId: log.toolEventId,
        timestamp: new Date(log.timestamp).toLocaleString(),
        status: {
          label: log.severity,
          variant: log.severity === 'ERROR' ? 'error' as const :
                  log.severity === 'WARNING' ? 'warning' as const :
                  log.severity === 'INFO' ? 'info' as const :
                  log.severity === 'CRITICAL' ? 'critical' as const : 'success' as const
        },
        source: {
          name: toToolLabel(log.toolType),
          toolType: normalizeToolTypeWithFallback(log.toolType)
        },
        device: {
          // Use device.hostname if available, fallback to deviceId
          name: log.device?.hostname || log.hostname || log.deviceId || '-',
          // Use device.organization (string) if available, fallback to organizationName or userId
          organization: log.device?.organization || log.organizationName || log.userId || '-'
        },
        description: {
          title: log.summary || 'No summary available',
          details: log.details
        },
        originalLogEntry: log
      }
    })
  }, [logs, deviceId])

  const columns: TableColumn<UILogEntry>[] = useMemo(() => {
    const allColumns: TableColumn<UILogEntry>[] = [
      {
        key: 'logId',
        label: 'Log ID',
        width: 'w-[200px]',
        renderCell: (log) => (
          <TableTimestampCell
            timestamp={log.timestamp}
            id={log.logId}
            formatTimestamp={false}
          />
        )
      },
      {
        key: 'status',
        label: 'Status',
        width: 'w-[120px]',
        filterable: true,
        filterOptions: logFilters?.severities?.map((severity: string) => ({
          id: severity,
          label: severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase(),
          value: severity
        })) || [],
        renderCell: (log) => (
          <div className="shrink-0">
            <StatusTag
              label={log.status.label}
              variant={log.status.variant}
            />
          </div>
        )
      },
      {
        key: 'tool',
        label: 'Tool',
        width: 'w-[150px]',
        hideAt: 'sm',
        filterable: true,
        filterOptions: logFilters?.toolTypes?.map((toolType: string) => ({
          id: toolType,
          label: toToolLabel(toolType),
          value: toolType
        })) || [],
        renderCell: (log) => (
          <ToolBadge toolType={normalizeToolTypeWithFallback(log.source.toolType)} />
        )
      },
      {
        key: 'source',
        label: 'SOURCE',
        width: 'w-[120px]',
        hideAt: 'md',
        filterable: true,
        filterOptions: transformOrganizationFilters(logFilters?.organizations),
        renderCell: (log) => (
          <DeviceCardCompact
            deviceName={log.device.name === 'null' ? 'System' : log.device.name}
            organization={log.device.organization}
          />
        )
      },
      {
        key: 'description',
        label: 'Log Details',
        width: 'flex-1',
        hideAt: 'xl',
        renderCell: (log) => (
          <TableDescriptionCell text={log.description.title} />
        )
      }
    ]

    // Filter out device column when embedded (showing device-specific logs)
    if (embedded) {
      return allColumns.filter(col => col.key !== 'source')
    }

    return allColumns
  }, [embedded, logFilters])

  // Build URL for log details page (opens in new tab)
  const getLogDetailsUrl = useCallback((log: UILogEntry): string => {
    const original = log.originalLogEntry || log
    const id = log.id || log.logId
    return `/log-details?id=${id}&ingestDay=${original.ingestDay}&toolType=${original.toolType}&eventType=${original.eventType}&timestamp=${encodeURIComponent(original.timestamp || '')}`
  }, [])

  // Render row actions with external link button
  const renderRowActions = useCallback((log: UILogEntry) => (
    <Button
      variant="outline"
      navigateUrl={getLogDetailsUrl(log)}
      showExternalLinkOnHover
      openInNewTab={true}
      className="bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    >
      Details
    </Button>
  ), [getLogDetailsUrl])

  // Refetch when filters change
  const initialFilterLoadDone = useRef(false)
  useEffect(() => {
    if (initialFilterLoadDone.current) {
      // Only refetch if filters actually changed (not on mount)
      if (prevFiltersKeyRef.current !== null && prevFiltersKeyRef.current !== filtersKey) {
        const refetch = async () => {
          await searchLogs(paginationParams.search)
          await fetchLogFilters(backendFilters)
        }
        refetch()
        setHasLoadedBeyondFirst(false)
      }
    } else {
      initialFilterLoadDone.current = true
    }
    prevFiltersKeyRef.current = filtersKey
  }, [filtersKey])

  const handleRowClick = useCallback((log: UILogEntry) => {
    setSelectedLog(log)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null)
  }, [])

  const handleRefresh = useCallback(() => {
    refreshLogs()
    fetchLogFilters()
    setHasLoadedBeyondFirst(false)
  }, [refreshLogs, fetchLogFilters, setHasLoadedBeyondFirst])

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }), [handleRefresh])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Reset cursor and update filter params
    setPaginationParams({ cursor: '' })
    setFilterParams({
      severities: columnFilters.status || [],
      toolTypes: columnFilters.tool || [],
      organizationIds: columnFilters.source || []
    })
    setHasLoadedBeyondFirst(false)
  }, [setFilterParams, setPaginationParams, setHasLoadedBeyondFirst])

  const onNext = useCallback(async () => {
    if (hasNextPage && pageInfo?.endCursor) {
      await handleNextPage(pageInfo.endCursor, fetchNextPage)
    }
  }, [hasNextPage, pageInfo, handleNextPage, fetchNextPage])

  const onReset = useCallback(async () => {
    await handleResetToFirstPage(fetchFirstPage)
  }, [handleResetToFirstPage, fetchFirstPage])

  const cursorPagination = useTablePagination(
    pageInfo ? {
      type: 'server',
      hasNextPage,
      hasLoadedBeyondFirst,
      startCursor: pageInfo.startCursor,
      endCursor: pageInfo.endCursor,
      itemCount: logs.length,
      itemName: 'logs',
      onNext,
      onReset,
      showInfo: true
    } : null
  )

  // Convert URL params to table filters format for the Table component
  const tableFilters = useMemo(() => ({
    status: filterParams.severities,
    tool: filterParams.toolTypes,
    source: filterParams.organizationIds
  }), [filterParams.severities, filterParams.toolTypes, filterParams.organizationIds])

  const tableContent = (
    <>
      <Table
        data={transformedLogs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={10}
        emptyMessage={deviceId ? "No logs found for this device. Try adjusting your search or filters." : "No logs found. Try adjusting your search or filters."}
        onRowClick={handleRowClick}
        renderRowActions={!embedded ? renderRowActions : undefined}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        rowClassName="mb-1"
        cursorPagination={!embedded ? cursorPagination : undefined}
      />

      {/* Log Info Modal - Side Menu */}
      <LogInfoModal
        isOpen={!!selectedLog}
        onClose={handleCloseModal}
        log={selectedLog}
        fetchLogDetails={fetchLogDetails}
      />
    </>
  )

  // Embedded mode: return table without ListPageLayout
  if (embedded) {
    return (
      <div className="space-y-4 mt-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
            Logs ({transformedLogs.length})
          </h3>
        </div>

        <div className="flex gap-4 items-stretch h-[48px]">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-[48px] min-h-[48px] bg-ods-card border border-ods-border"
              style={{ height: 48 }}
            />
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleRefresh}
              leftIcon={<Refresh02HrIcon size={20} />}
              className="h-[48px] min-h-[48px] whitespace-nowrap py-0 flex items-center"
              style={{ height: 48 }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-[6px] text-red-400 font-['DM_Sans'] text-[14px]">
            {error}
          </div>
        )}

        {tableContent}
      </div>
    )
  }
  const actions = useMemo(() => [
    {
      label: 'Refresh',
      icon: <Refresh02HrIcon size={24} className="text-ods-text-secondary" />,
      onClick: handleRefresh
    }
  ], [handleRefresh])

  const filterGroups = columns.filter(column => column.filterable).map(column => ({
    id: column.key,
    title: column.label,
    options: column.filterOptions || []
  }))

  // Full page mode: return with ListPageLayout
  return (
    <ListPageLayout
      title="Logs"
      actions={actions}
      searchPlaceholder="Search for Logs"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      currentMobileFilters={tableFilters}
    >
      {tableContent}
    </ListPageLayout>
  )
})