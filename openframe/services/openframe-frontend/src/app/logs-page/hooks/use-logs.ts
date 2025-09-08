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
  logDetails: LogEntry
}

interface CursorPaginationInput {
  limit: number
  cursor?: string | null
}

interface LogFilterInput {
  severities?: string[]
  toolTypes?: string[]
  deviceId?: string[]
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

  // Fetch logs from GraphQL API with specific search term and filters
  const fetchLogs = useCallback(async (
    searchTerm: string,
    filters: LogFilterInput = {},
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
  }, [pageSize, toast])

  // Fetch next page of logs
  const fetchNextPage = useCallback(async () => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) {
      return
    }
    
    return fetchLogs(search, activeFilters, pageInfo.endCursor, true)
  }, [pageInfo, fetchLogs, search, activeFilters])

  // Fetch previous page of logs  
  const fetchPreviousPage = useCallback(async () => {
    if (!pageInfo?.hasPreviousPage || !pageInfo?.startCursor) {
      return
    }
    
    return fetchLogs(search, activeFilters, pageInfo.startCursor, false)
  }, [pageInfo, fetchLogs, search, activeFilters])

  // Fetch a single log's details
  const fetchLogDetails = useCallback(async (logEntry: LogEntry) => {
    try {
      const response = await apiClient.post<GraphQLResponse<LogDetailsResponse>>('graphql', {
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

      return graphqlResponse.data.logDetails
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
    return fetchLogs(searchTerm, activeFilters, null, false)
  }, [setSearch, fetchLogs, activeFilters])

  // Change page size
  const changePageSize = useCallback(async (newSize: number) => {
    setPageSize(newSize)
    return fetchLogs(search, activeFilters, null, false)
  }, [setPageSize, fetchLogs, search, activeFilters])

  // Refresh logs (re-fetch with current filter and search)
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
    fetchPreviousPage,
    fetchLogDetails,
    searchLogs,
    changePageSize,
    refreshLogs,
    clearLogs,
    reset
  }
}