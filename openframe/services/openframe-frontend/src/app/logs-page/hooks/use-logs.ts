'use client'

import { useCallback, useState } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { useLogsStore, LogEntry, LogEdge, PageInfo, LogFilters } from '../stores/logs-store'
import { GET_LOGS_QUERY, GET_LOG_DETAILS_QUERY, GET_LOG_FILTERS_QUERY } from '../queries/logs-queries'

interface LogsResponse {
  logs: {
    edges: LogEdge[]
    pageInfo: PageInfo
  }
}

interface LogDetailsResponse {
  logDetails: LogEntry
}

interface CursorPaginationInput {
  limit: number
  cursor?: string | null
}

interface LogFilterInput {
  severities?: string[]
  toolTypes?: string[]
  deviceId?: string
  userId?: string[]
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export function useLogs(activeFilters: LogFilterInput = {}) {
  const { toast } = useToast()
  const {
    logs,
    edges,
    search,
    pageInfo,
    pageSize,
    error,
    setEdges,
    appendEdges,
    setSearch,
    setPageInfo,
    setPageSize,
    setError,
    clearLogs,
    reset
  } = useLogsStore()

  // Use LOCAL state for isLoading with initial=true to show skeleton immediately on mount
  // (before useEffect triggers fetch). This prevents the flash of empty state.
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Transform backend log data to include Device structure
   * Maps flat fields (hostname, organizationName, organizationId) to partial Device object
   */
  const transformLogEntry = (logEntry: LogEntry): LogEntry => {
    // If we have device-related fields, create a partial Device object
    if (logEntry.deviceId || logEntry.hostname || logEntry.organizationName) {
      return {
        ...logEntry,
        device: {
          id: logEntry.deviceId || '',
          machineId: logEntry.deviceId || '',
          hostname: logEntry.hostname || logEntry.deviceId || '',
          displayName: logEntry.hostname || '',
          organizationId: logEntry.organizationId,
          organization: logEntry.organizationName || logEntry.organizationId || ''
        }
      }
    }
    return logEntry
  }

  const fetchLogs = useCallback(async (
    searchTerm: string,
    filters: LogFilterInput = {},
    cursor?: string | null,
    append: boolean = false
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const pagination: CursorPaginationInput = {
        limit: pageSize,
        cursor: cursor || null
      }

      const response = await apiClient.post<GraphQLResponse<LogsResponse>>('/api/graphql', {
        query: GET_LOGS_QUERY,
        variables: {
          filter: filters,
          pagination,
          search: searchTerm || ''
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data

      if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      if (!graphqlResponse?.data) {
        throw new Error('No data received from server')
      }

      const logsData = graphqlResponse.data

      // Transform log entries to include device structure
      const transformedEdges = logsData.logs.edges.map(edge => ({
        ...edge,
        node: transformLogEntry(edge.node)
      }))

      // DEBUG: Check for duplicate keys before updating store
      const ids = transformedEdges.map(e => e.node.toolEventId)
      const uniqueIds = new Set(ids)
      if (ids.length !== uniqueIds.size) {
        const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
        console.error('⚠️ DUPLICATE LOG KEYS DETECTED from backend:', duplicates)
        console.error('Full edge count:', transformedEdges.length, 'Unique IDs:', uniqueIds.size)
      }

      if (append) {
        console.log('[useLogs] Appending', transformedEdges.length, 'logs')
        appendEdges(transformedEdges)
      } else {
        console.log('[useLogs] Replacing with', transformedEdges.length, 'logs')
        setEdges(transformedEdges)
      }

      setPageInfo(logsData.logs.pageInfo)

      return logsData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch logs'
      console.error('Failed to fetch logs:', error)
      setError(errorMessage)

      toast({
        title: 'Error fetching logs',
        description: errorMessage,
        variant: 'destructive'
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, toast])

  const fetchNextPage = useCallback(async () => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) {
      return
    }
    
    return fetchLogs(search, activeFilters, pageInfo.endCursor, false)
  }, [pageInfo, fetchLogs, search, activeFilters])

  const fetchFirstPage = useCallback(async () => {
    return fetchLogs(search, activeFilters, null, false)
  }, [fetchLogs, search, activeFilters])

  const fetchLogDetails = useCallback(async (logEntry: LogEntry) => {
    try {
      const response = await apiClient.post<GraphQLResponse<LogDetailsResponse>>('/api/graphql', {
        query: GET_LOG_DETAILS_QUERY,
        variables: {
          logId: logEntry.toolEventId,
          ingestDay: logEntry.ingestDay,
          toolType: logEntry.toolType,
          eventType: logEntry.eventType,
          timestamp: logEntry.timestamp
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data

      if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      if (!graphqlResponse?.data) {
        throw new Error('No data received from server')
      }

      // Transform log details to include device structure
      const logDetails = transformLogEntry(graphqlResponse.data.logDetails)

      return logDetails
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch log details'
      console.error('Failed to fetch log details:', error)

      toast({
        title: 'Error fetching log details',
        description: errorMessage,
        variant: 'destructive'
      })

      throw error
    }
  }, [toast])

  const searchLogs = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    return fetchLogs(searchTerm, activeFilters, null, false)
  }, [setSearch, fetchLogs, activeFilters])

  const changePageSize = useCallback(async (newSize: number) => {
    setPageSize(newSize)
    return fetchLogs(search, activeFilters, null, false)
  }, [setPageSize, fetchLogs, search, activeFilters])

  const refreshLogs = useCallback(async () => {
    return fetchLogs(search, activeFilters, null, false)
  }, [fetchLogs, search, activeFilters])

  return {
    // State
    logs,
    edges,
    search,
    pageInfo,
    pageSize,
    isLoading,
    error,
    hasNextPage: pageInfo?.hasNextPage ?? false,
    hasPreviousPage: pageInfo?.hasPreviousPage ?? false,
    
    // Actions
    fetchLogs,
    fetchNextPage,
    fetchFirstPage,
    fetchLogDetails,
    searchLogs,
    changePageSize,
    refreshLogs,
    clearLogs,
    reset
  }
}

/**
 * Hook for fetching log filter options
 */
export function useLogFilters() {
  const { toast } = useToast()
  const [logFilters, setLogFilters] = useState<LogFilters | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogFilters = useCallback(async (filter?: LogFilterInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<GraphQLResponse<{ logFilters: LogFilters }>>('/api/graphql', {
        query: GET_LOG_FILTERS_QUERY,
        variables: {
          filter: filter || {}
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data

      if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      if (!graphqlResponse?.data) {
        throw new Error('No data received from server')
      }

      setLogFilters(graphqlResponse.data.logFilters)
      return graphqlResponse.data.logFilters
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch log filters'
      console.error('Failed to fetch log filters:', error)
      setError(errorMessage)

      toast({
        title: 'Error fetching log filters',
        description: errorMessage,
        variant: 'destructive'
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  return {
    logFilters,
    isLoading,
    error,
    fetchLogFilters
  }
}