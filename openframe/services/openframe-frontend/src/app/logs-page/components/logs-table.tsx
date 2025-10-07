'use client'

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  StatusTag,
  Button,
  ListPageLayout,
  type TableColumn,
  type RowAction
} from "@flamingo/ui-kit/components/ui"
import { RefreshIcon } from "@flamingo/ui-kit/components/icons"
import { ToolIcon } from "@flamingo/ui-kit/components/tool-icon"
import { MoreHorizontal } from "lucide-react"
import { useDebounce } from "@flamingo/ui-kit/hooks"
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

export function LogsTable() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ severities?: string[], toolTypes?: string[] }>({})
  const [tableFilters, setTableFilters] = useState<Record<string, any[]>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedLog, setSelectedLog] = useState<UILogEntry | null>(null)
  const prevFilterKeyRef = React.useRef<string | null>(null)
  
  const { logs, isLoading, error, searchLogs, refreshLogs, fetchLogDetails } = useLogs(filters)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Transform API logs to UI format
  const transformedLogs: UILogEntry[] = useMemo(() => {
    return logs.map((log) => {
      const mapToolType = (toolType: string) => {
        const typeMap: Record<string, string> = {
          'TACTICAL': 'tactical',
          'MESHCENTRAL': 'meshcentral',
          'FLEET': 'fleet'
        }
        return typeMap[toolType] || 'unknown'
      }

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
          name: log.toolType,
          toolType: mapToolType(log.toolType)
        },
        device: {
          name: log.deviceId || 'Unknown Device',
          organization: log.userId || undefined
        },
        description: {
          title: log.summary || 'No summary available',
          details: log.details
        },
        originalLogEntry: log
      }
    })
  }, [logs])

  const columns: TableColumn<UILogEntry>[] = useMemo(() => [
    {
      key: 'logId',
      label: 'Log ID',
      width: 'w-1/3',
      renderCell: (log) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {log.logId}
          </span>
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
            {log.timestamp}
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
        { id: 'TACTICAL', label: 'Tactical', value: 'TACTICAL' },
        { id: 'MESHCENTRAL', label: 'MeshCentral', value: 'MESHCENTRAL' },
        { id: 'FLEET', label: 'Fleet', value: 'FLEET' },
        { id: 'AUTHENTIK', label: 'Authentik', value: 'AUTHENTIK' },
        { id: 'OPENFRAME', label: 'OpenFrame', value: 'OPENFRAME' },
        { id: 'SYSTEM', label: 'System', value: 'SYSTEM' }
      ],
      renderCell: (log) => (
        <div className="flex flex-col justify-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
              {log.source.name}
            </span>
            <ToolIcon toolType={log.source.toolType as any} size={16} />
          </div>
        </div>
      )
    },
    {
      key: 'device',
      label: 'Device',
      width: 'w-1/6',
      renderCell: (log) => (
        <div className="flex flex-col justify-center shrink-0">
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {log.device.name}
          </span>
          {log.device.organization && (
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
              {log.device.organization}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Log Details',
      width: 'w-1/2',
      renderCell: (log) => (
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col justify-center">
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
              {log.description.title}
            </span>
            {log.description.details && (
              <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                {log.description.details}
              </span>
            )}
          </div>
        </div>
      )
    }
  ], [])

  const rowActions: RowAction<UILogEntry>[] = useMemo(() => [
    {
      label: 'Details',
      onClick: (log) => {
        const ingestDay = log.originalLogEntry?.ingestDay
        const toolType = log.originalLogEntry?.toolType
        const eventType = log.originalLogEntry?.eventType
        const timestamp = log.originalLogEntry?.timestamp
        router.push(`/log-details?id=${log.id}&ingestDay=${ingestDay}&toolType=${toolType}&eventType=${eventType}&timestamp=${encodeURIComponent(timestamp || '')}`)
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
        toolTypes: filters.toolTypes?.sort() || []
      })
      
      if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
        refreshLogs()
      }
      prevFilterKeyRef.current = filterKey
    }
  }, [filters, refreshLogs, isInitialized])

  const handleRowClick = useCallback((log: UILogEntry) => {
    setSelectedLog(log)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null)
  }, [])

  const handleRefresh = useCallback(() => {
    refreshLogs()
  }, [refreshLogs])

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
      {/* Table */}
      <Table
        data={transformedLogs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage="No logs found. Try adjusting your search or filters."
        onRowClick={handleRowClick}
        rowActions={rowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        mobileColumns={['logId', 'status', 'device']}
        rowClassName="mb-1"
        actionsWidth={100}
      />

      {/* Log Info Modal */}
      <LogInfoModal
        isOpen={!!selectedLog}
        onClose={handleCloseModal}
        log={selectedLog}
        fetchLogDetails={fetchLogDetails}
      />
    </ListPageLayout>
  )
}