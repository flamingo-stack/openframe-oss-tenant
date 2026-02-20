'use client'

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GET_DEVICES_QUERY, GET_DEVICE_FILTERS_QUERY } from '../queries/devices-queries'
import { Device, DeviceFilterInput, DeviceFilters, DevicesGraphQLNode, GraphQLResponse } from '../types/device.types'
import { createDeviceListItem } from '../utils/device-transform'

export function useDevices(filters: DeviceFilterInput = {}) {
  const { toast } = useToast()
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceFilters, setDeviceFilters] = useState<DeviceFilters | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState<any>(null)
  const [filteredCount, setFilteredCount] = useState(0)
  const [hasLoadedBeyondFirst, setHasLoadedBeyondFirst] = useState(false)
  
  // Stabilize filters to prevent infinite loops while still detecting changes
  const filtersKey = JSON.stringify(filters)
  const stableFilters = useMemo(() => filters, [filtersKey])
  const filtersRef = useRef(stableFilters)
  filtersRef.current = stableFilters

  const fetchDevices = useCallback(async (searchTerm?: string, cursor?: string | null) => {
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
          pagination: { limit: 10, cursor: cursor || null },
          search: searchTerm || '',
          sort: { field: 'status', direction: 'DESC' }
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

      // Create Device objects directly
      const transformedDevices: Device[] = nodes.map(createDeviceListItem)

      setDevices(transformedDevices)
      setPageInfo(graphqlResponse.data.devices.pageInfo)
      setFilteredCount(graphqlResponse.data.devices.filteredCount)
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
    setHasLoadedBeyondFirst(false) // Reset pagination state on new search
    fetchDevices(searchTerm)
  }, [fetchDevices])

  const refreshDevices = useCallback(() => {
    fetchDevices()
    fetchDeviceFilters()
  }, [fetchDevices, fetchDeviceFilters])

  // Note: Initial fetch is controlled by the view component, not the hook
  // This allows views to pass cursor from URL on initial load
  // Track if first fetch has been done (set by view component)
  const initialLoadDone = useRef(false)
  // Track previous filters to detect actual changes vs initial render
  const prevFiltersKey = useRef<string | null>(null)

  // Function to mark initial load as done (called by view component after first fetch)
  const markInitialLoadDone = useCallback(() => {
    initialLoadDone.current = true
    // Also set the initial filters key so we don't refetch on first render
    prevFiltersKey.current = filtersKey
  }, [filtersKey])

  const fetchNextPage = useCallback(async (searchTerm: string) => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) {
      return
    }
    setHasLoadedBeyondFirst(true)
    return fetchDevices(searchTerm, pageInfo.endCursor)
  }, [pageInfo, fetchDevices])

  const fetchFirstPage = useCallback(async (searchTerm: string) => {
    setHasLoadedBeyondFirst(false)
    return fetchDevices(searchTerm)
  }, [fetchDevices])

  // Refetch when filters change (after initial load, and only when filters ACTUALLY changed)
  useEffect(() => {
    // Only refetch if:
    // 1. Initial load is done
    // 2. Previous filters key was set (not first render after initial load)
    // 3. Filters actually changed
    if (initialLoadDone.current && prevFiltersKey.current !== null && prevFiltersKey.current !== filtersKey) {
      const refetch = async () => {
        await fetchDevices()
        await fetchDeviceFilters()
      }
      refetch()
    }
    // Update previous filters key (but only after initial load)
    if (initialLoadDone.current) {
      prevFiltersKey.current = filtersKey
    }
  }, [filtersKey, fetchDevices, fetchDeviceFilters])

  return {
    devices,
    deviceFilters,
    isLoading,
    error,
    searchDevices,
    refreshDevices,
    fetchDevices,
    fetchDeviceFilters,
    pageInfo,
    filteredCount,
    fetchNextPage,
    fetchFirstPage,
    hasLoadedBeyondFirst,
    setHasLoadedBeyondFirst,
    markInitialLoadDone
  }
}