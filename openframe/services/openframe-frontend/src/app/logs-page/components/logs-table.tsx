'use client'

import React, { useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  StatusTag,
  Button,
  ListPageLayout,
  TableDescriptionCell,
  type TableColumn,
  type RowAction
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { ToolBadge } from "@flamingo/ui-kit"
import { useDebounce } from "@flamingo/ui-kit/hooks"
import { toStandardToolLabel, toUiKitToolType } from '@lib/tool-labels'
import { navigateToLogDetails } from '@lib/log-navigation'
import { useLogs } from '../hooks/use-logs'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ severities?: string[], toolTypes?: string[], deviceId?: string }>({})
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedLog, setSelectedLog] = useState<UILogEntry | null>(null)
  const prevFilterKeyRef = React.useRef<string | null>(null)

  // TEMPORARY: Don't pass deviceId to backend (not supported yet in GraphQL)
  // Only pass severities and toolTypes to backend
  const backendFilters = useMemo(() => {
    return {
      severities: filters.severities,
      toolTypes: filters.toolTypes
      // deviceId NOT included - backend doesn't support it yet
    }
  }, [filters])

  const { logs, isLoading, error, searchLogs, refreshLogs, fetchLogDetails } = useLogs(backendFilters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Transform API logs to UI format
  // TEMPORARY: Client-side filter as workaround until backend supports deviceId in LogFilterInput
  const transformedLogs: UILogEntry[] = useMemo(() => {
    let filteredLogs = logs

    // Temporary client-side deviceId filter (remove when backend adds support)
    if (deviceId) {
      filteredLogs = logs.filter(log => log.deviceId === deviceId)
    }

    return filteredLogs.map((log) => {
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
          name: log.deviceId ? log.deviceId === 'null' ? '' : log.deviceId : '',
          organization: log.userId ? log.userId === 'null' ? '' : log.userId : ''
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
        width: 'w-1/3',
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
        width: 'w-1/6',
        filterable: true,
        filterOptions: [
          { id: 'ERROR', label: 'Error', value: 'ERROR' },
          { id: 'WARNING', label: 'Warning', value: 'WARNING' },
          { id: 'INFO', label: 'Info', value: 'INFO' },
          { id: 'SUCCESS', label: 'Success', value: 'SUCCESS' },
          { id: 'CRITICAL', label: 'Critical', value: 'CRITICAL' }
        ],
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
        width: 'w-1/6',
        filterable: true,
        filterOptions: [
          { id: 'tactical', label: 'Tactical', value: 'tactical' },
          { id: 'meshcentral', label: 'MeshCentral', value: 'meshcentral' },
          { id: 'fleet', label: 'Fleet', value: 'fleet' },
          { id: 'authentik', label: 'Authentik', value: 'authentik' },
          { id: 'openframe', label: 'OpenFrame', value: 'openframe' },
          { id: 'system', label: 'System', value: 'system' }
        ],
        renderCell: (log) => (
          <ToolBadge toolType={log.source.toolType as any} />
        )
      },
      {
        key: 'device',
        label: 'DEVICE',
        width: 'w-1/6',
        renderCell: (log) => (
          <div className="bg-ods-card box-border content-stretch flex gap-4 h-20 items-center justify-start py-0 relative shrink-0 w-full">
            {log.device.name && (
              <div className="font-['DM_Sans'] font-medium text-[18px] leading-[20px] text-ods-text-primary truncate">
                <p className="leading-[24px] overflow-ellipsis overflow-hidden whitespace-pre">
                  {log.device.name}
                </p>
              </div>
            )}
          </div>
        )
      },
      {
        key: 'description',
        label: 'Log Details',
        width: 'w-1/2',
        renderCell: (log) => (
          <TableDescriptionCell text={log.description.title} />
        )
      }
    ]

    // Filter out device column when embedded (showing device-specific logs)
    if (embedded) {
      return allColumns.filter(col => col.key !== 'device')
    }

    return allColumns
  }, [embedded])

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

  useEffect(() => {
    if (!isInitialized) {
      searchLogs('')
      setIsInitialized(true)
    }
  }, [isInitialized, searchLogs])

  useEffect(() => {
    if (isInitialized && debouncedSearchTerm !== undefined) {
      searchLogs(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm, searchLogs, isInitialized])
  
  useEffect(() => {
    if (isInitialized) {
      const filterKey = JSON.stringify({
        severities: filters.severities?.sort() || [],
        toolTypes: filters.toolTypes?.sort() || [],
        deviceId: deviceId || null
      })

      if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
        refreshLogs()
      }
      prevFilterKeyRef.current = filterKey
    }
  }, [filters, deviceId, refreshLogs, isInitialized])

  const handleRowClick = useCallback((log: UILogEntry) => {
    setSelectedLog(log)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null)
  }, [])

  const handleRefresh = useCallback(() => {
    refreshLogs()
  }, [refreshLogs])

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh
  }), [handleRefresh])

  const handleFilterChange = useCallback((columnFilters: Record<string, any[]>) => {
    setTableFilters(columnFilters)

    const newFilters: any = {}

    if (columnFilters.status?.length > 0) {
      newFilters.severities = columnFilters.status
    }

    if (columnFilters.tool?.length > 0) {
      newFilters.toolTypes = columnFilters.tool
    }
    
    setFilters(prev => {
      if (JSON.stringify(prev.severities?.sort()) === JSON.stringify(newFilters.severities?.sort()) &&
          JSON.stringify(prev.toolTypes?.sort()) === JSON.stringify(newFilters.toolTypes?.sort())) {
        return prev
      }
      return newFilters
    })
  }, [])


  const headerActions = (
    <Button
      onClick={handleRefresh}
      leftIcon={<RefreshIcon size={20} />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
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
        actionsWidth={100}
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

        {/* Embedded header with search and refresh */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-ods-card border border-ods-border rounded-[6px] text-ods-text-primary font-['DM_Sans'] text-[16px] placeholder:text-ods-text-secondary focus:outline-none focus:ring-2 focus:ring-ods-accent"
            />
          </div>
          {headerActions}
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
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
    >
      {tableContent}
    </ListPageLayout>
  )
})