'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { Device, DeviceFilters, DeviceFilterInput, DevicesGraphQLNode, GraphQLResponse } from '../types/device.types'
import { GET_DEVICES_QUERY, GET_DEVICE_FILTERS_QUERY } from '../queries/devices-queries'
import { normalizeDeviceListNode } from '../utils/normalize-device'

export function useDevices(filters: DeviceFilterInput = {}) {
  const { toast } = useToast()
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceFilters, setDeviceFilters] = useState<DeviceFilters | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchDevices = useCallback(async (searchTerm?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<GraphQLResponse<{ devices: {
        edges: Array<{ node: DevicesGraphQLNode, cursor: string }>
        pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string, endCursor?: string }
        filteredCount: number
      }}>>('/api/graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter: filtersRef.current,
          pagination: { limit: 100, cursor: null },
          search: searchTerm || ''
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data
      if (!graphqlResponse?.data) {
        throw new Error('No data received from server')
      }
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      const nodes = graphqlResponse.data.devices.edges.map(e => e.node)

      // Use shared normalization function for consistency
      const transformedDevices: Device[] = nodes.map(normalizeDeviceListNode)

      setDevices(transformedDevices)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch devices'
      setError(errorMessage)
      
      toast({
        title: "Failed to Load Devices",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchDeviceFilters = useCallback(async () => {
    try {
      const response = await apiClient.post<GraphQLResponse<{ deviceFilters: DeviceFilters }>>('/api/graphql', {
        query: GET_DEVICE_FILTERS_QUERY,
        variables: {
          filter: filtersRef.current
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data
      if (!graphqlResponse?.data) return
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      setDeviceFilters(graphqlResponse.data.deviceFilters)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch device filters'
      console.error('Device filters error:', errorMessage)
    }
  }, [])

  const searchDevices = useCallback((searchTerm: string) => {
    fetchDevices(searchTerm)
  }, [fetchDevices])

  const refreshDevices = useCallback(() => {
    fetchDevices()
    fetchDeviceFilters()
  }, [fetchDevices, fetchDeviceFilters])

  const initialLoadDone = useRef(false)
  
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      fetchDevices()
      fetchDeviceFilters()
    }
  }, [])

  return {
    devices,
    deviceFilters,
    isLoading,
    error,
    searchDevices,
    refreshDevices,
    fetchDevices
  }
}