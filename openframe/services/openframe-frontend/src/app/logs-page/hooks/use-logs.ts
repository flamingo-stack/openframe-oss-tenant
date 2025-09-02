'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '../../../lib/api-client'
import { useLogsStore, LogEntry, LogEdge, PageInfo } from '../stores/logs-store'
import { GET_LOGS_QUERY, GET_LOG_DETAILS_QUERY } from '../queries/logs-queries'

interface LogsResponse {
  logs: {
    edges: LogEdge[]
    pageInfo: PageInfo
  }
}

interface LogDetailsResponse {
  log: LogEntry
}

interface CursorPaginationInput {
  limit: number
  cursor?: string | null
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export function useLogs() {
  const { toast } = useToast()
  const {
    logs,
    edges,
    search,
    pageInfo,
    pageSize,
    isLoading,
    error,
    setEdges,
    appendEdges,
    setSearch,
    setPageInfo,
    setPageSize,
    setLoading,
    setError,
    clearLogs,
    reset
  } = useLogsStore()

  const [isInitialized, setIsInitialized] = useState(false)

  // Fetch logs from GraphQL API
  const fetchLogs = useCallback(async (
    cursor?: string | null,
    append: boolean = false
  ) => {
    setLoading(true)
    setError(null)

    try {
      const pagination: CursorPaginationInput = {
        limit: pageSize,
        cursor: cursor || null
      }

      const response = await apiClient.post<GraphQLResponse<LogsResponse>>('graphql', {
        query: GET_LOGS_QUERY,
        variables: {
          filter: {},
          pagination,
          search: search || ''
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
      
      if (append) {
        appendEdges(logsData.logs.edges)
      } else {
        setEdges(logsData.logs.edges)
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
      setLoading(false)
    }
  }, [search, pageSize, setLoading, setError, setEdges, appendEdges, setPageInfo, toast])

  // Fetch next page of logs
  const fetchNextPage = useCallback(async () => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) {
      return
    }
    
    return fetchLogs(pageInfo.endCursor, true)
  }, [pageInfo, fetchLogs])

  // Fetch previous page of logs  
  const fetchPreviousPage = useCallback(async () => {
    if (!pageInfo?.hasPreviousPage || !pageInfo?.startCursor) {
      return
    }
    
    return fetchLogs(pageInfo.startCursor, false)
  }, [pageInfo, fetchLogs])

  // Fetch a single log's details
  const fetchLogDetails = useCallback(async (logId: string) => {
    try {
      const response = await apiClient.post<GraphQLResponse<LogDetailsResponse>>('graphql', {
        query: GET_LOG_DETAILS_QUERY,
        variables: {
          id: logId
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

      return graphqlResponse.data.log
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


  // Search logs
  const searchLogs = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    clearLogs()
    return fetchLogs(null, false)
  }, [setSearch, clearLogs, fetchLogs])

  // Change page size
  const changePageSize = useCallback(async (newSize: number) => {
    setPageSize(newSize)
    clearLogs()
    return fetchLogs(null, false)
  }, [setPageSize, clearLogs, fetchLogs])

  // Refresh logs (re-fetch with current filter and search)
  const refreshLogs = useCallback(async () => {
    clearLogs()
    return fetchLogs(null, false)
  }, [clearLogs, fetchLogs])

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      // Optionally fetch initial logs
      // fetchLogs(null, 'forward', false)
    }
  }, [isInitialized])

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
    fetchPreviousPage,
    fetchLogDetails,
    searchLogs,
    changePageSize,
    refreshLogs,
    clearLogs,
    reset
  }
}