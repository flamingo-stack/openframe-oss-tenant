'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '../../../lib/api-client'
import { GET_LOG_DETAILS_QUERY } from '../../logs-page/queries/logs-queries'
import type { LogEntry } from '../../logs-page/stores/logs-store'

interface LogDetailsResponse {
  logDetails: LogEntry
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export function useLogDetails() {
  const { toast } = useToast()
  const [logDetails, setLogDetails] = useState<LogEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogDetailsByID = useCallback(async (logId: string, ingestDay: string, toolType: string, eventType: string, timestamp: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<GraphQLResponse<LogDetailsResponse>>('graphql', {
        query: GET_LOG_DETAILS_QUERY,
        variables: {
          logId: logId,
          ingestDay: ingestDay,
          toolType: toolType,
          eventType: eventType,
          timestamp: timestamp
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

      setLogDetails(graphqlResponse.data.logDetails)
      return graphqlResponse.data.logDetails
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch log details'
      console.error('Failed to fetch log details:', error)
      setError(errorMessage)
      
      toast({
        title: 'Error fetching log details',
        description: errorMessage,
        variant: 'destructive'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const clearLogDetails = useCallback(() => {
    setLogDetails(null)
    setError(null)
  }, [])

  return {
    logDetails,
    isLoading,
    error,
    fetchLogDetailsByID,
    clearLogDetails
  }
}