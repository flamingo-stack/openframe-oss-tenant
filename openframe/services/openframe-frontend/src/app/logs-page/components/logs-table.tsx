'use client'

import React, { useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  StatusTag,
  Button,
  ListPageLayout,
  TableDescriptionCell,
  DeviceCardCompact,
  type TableColumn,
  type RowAction,
  type CursorPaginationProps
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { Input, ToolBadge } from "@flamingo/ui-kit"
import { useDebounce, useApiParams, useTablePagination } from "@flamingo/ui-kit/hooks"
import { toStandardToolLabel, toUiKitToolType } from '@lib/tool-labels'
import { navigateToLogDetails } from '@lib/log-navigation'
import { transformOrganizationFilters } from '@lib/filter-utils'
import { useLogs, useLogFilters } from '../hooks/use-logs'
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
  const router = useRouter()

  // URL state management - all filters, search, and cursor persist in URL
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    severities: { type: 'array', default: [] },
    toolTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    cursor: { type: 'string', default: '' }
  })

  // Debounce search input for smoother UX
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearchInput = useDebounce(searchInput, 300)

  // Update URL when debounced input changes
  useEffect(() => {
    setParam('search', debouncedSearchInput)
  }, [debouncedSearchInput])

  const [selectedLog, setSelectedLog] = useState<UILogEntry | null>(null)
  const [hasLoadedBeyondFirst, setHasLoadedBeyondFirst] = useState(false)
  const initialLoadDone = React.useRef(false)

  const { logFilters, fetchLogFilters } = useLogFilters()

  const backendFilters = useMemo(() => {
    return {
      severities: params.severities,
      toolTypes: params.toolTypes,
      organizationIds: params.organizationIds,
      deviceId: deviceId
    }
  }, [params.severities, params.toolTypes, params.organizationIds, deviceId])

  // Stable filter key for detecting changes (like devices pattern)
  const filtersKey = useMemo(() => JSON.stringify({
    severities: params.severities?.sort() || [],
    toolTypes: params.toolTypes?.sort() || [],
    organizationIds: params.organizationIds?.sort() || [],
    deviceId: deviceId || null
  }), [params.severities, params.toolTypes, params.organizationIds, deviceId])

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
    hasNextPage
  } = useLogs(backendFilters)

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
          name: toStandardToolLabel(log.toolType),
          toolType: toUiKitToolType(log.toolType)
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
          <div className="flex flex-col justify-center shrink-0">
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
              {log.timestamp}
            </span>
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
              {log.logId}
            </span>
          </div>
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
        width: 'w-[160px]',
        filterable: true,
        filterOptions: logFilters?.toolTypes?.map((toolType: string) => ({
          id: toolType,
          label: toStandardToolLabel(toolType),
          value: toolType
        })) || [],
        renderCell: (log) => (
          <ToolBadge toolType={log.source.toolType as any} />
        )
      },
      {
        key: 'source',
        label: 'SOURCE',
        width: 'w-[240px]',
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

  const rowActions: RowAction<UILogEntry>[] = useMemo(() => [
    {
      label: 'Details',
      onClick: (log) => {
        navigateToLogDetails(router, log)
      },
      variant: 'outline',
      className: "bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] px-4 py-3 h-12"
    }
  ], [router])

  // deviceId prop is handled in backendFilters, not in URL state

  // Initialize once on mount (like devices)
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      searchLogs('')
      fetchLogFilters()
    }
  }, [])

  // Fetch when search changes (like devices)
  useEffect(() => {
    if (initialLoadDone.current && params.search !== undefined) {
      searchLogs(params.search)
      setHasLoadedBeyondFirst(false)
    }
  }, [params.search])

  // Refetch when filters change (like devices pattern)
  useEffect(() => {
    if (initialLoadDone.current) {
      const refetch = async () => {
        await searchLogs(params.search)
        await fetchLogFilters(backendFilters)
      }
      refetch()
      setHasLoadedBeyondFirst(false)
    }
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
  }, [refreshLogs, fetchLogFilters])

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }), [handleRefresh])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    // Batch update all params at once - single router.replace call
    setParams({
      cursor: '', // Reset cursor when filters change
      severities: columnFilters.status || [],
      toolTypes: columnFilters.tool || [],
      organizationIds: columnFilters.source || []
    })

    setHasLoadedBeyondFirst(false)
  }, [setParams])

  const handleNextPage = useCallback(async () => {
    if (hasNextPage && pageInfo?.endCursor) {
      setParam('cursor', pageInfo.endCursor)
      await fetchNextPage()
      setHasLoadedBeyondFirst(true)
    }
  }, [hasNextPage, pageInfo, fetchNextPage, setParam])

  const handleResetToFirstPage = useCallback(async () => {
    setParam('cursor', '')
    await fetchFirstPage()
    setHasLoadedBeyondFirst(false)
  }, [fetchFirstPage, setParam])

  const cursorPagination = useTablePagination(
    pageInfo ? {
      type: 'server',
      hasNextPage,
      hasLoadedBeyondFirst,
      startCursor: pageInfo.startCursor,
      endCursor: pageInfo.endCursor,
      itemCount: logs.length,
      itemName: 'logs',
      onNext: handleNextPage,
      onReset: handleResetToFirstPage,
      showInfo: true
    } : null
  )

  // Convert URL params to table filters format for the Table component
  const tableFilters = useMemo(() => ({
    status: params.severities,
    tool: params.toolTypes,
    source: params.organizationIds
  }), [params.severities, params.toolTypes, params.organizationIds])

  const headerActions = (
    <Button
      variant="outline"
      onClick={handleRefresh}
      leftIcon={<RefreshIcon size={20} />}
      className="h-12 whitespace-nowrap"
    >
      Refresh
    </Button>
  )

  const tableContent = (
    <>
      <Table
        data={transformedLogs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage={deviceId ? "No logs found for this device. Try adjusting your search or filters." : "No logs found. Try adjusting your search or filters."}
        onRowClick={handleRowClick}
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={embedded ? ['logId', 'status'] : ['logId', 'status', 'device']}
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
              leftIcon={<RefreshIcon size={20} />}
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

  // Full page mode: return with ListPageLayout
  return (
    <ListPageLayout
      title="Logs"
      headerActions={headerActions}
      searchPlaceholder="Search for Logs"
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
    >
      {tableContent}
    </ListPageLayout>
  )
})