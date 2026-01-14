'use client'

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { useCallback, useEffect, useState } from 'react'
import { DEVICE_STATUS } from '../../devices/constants/device-statuses'
import { GET_DEVICES_QUERY } from '../../devices/queries/devices-queries'
import { Device, DevicesGraphQLNode, GraphQLResponse } from '../../devices/types/device.types'
import { createDeviceListItem } from '../../devices/utils/device-transform'
import { mapPlatformsToOsTypes } from '../utils/script-utils'
import { ScriptDetails } from './use-script-details'

interface UseRunScriptDataOptions {
  scriptId: string
}

/**
 * Hook for Run Script page that:
 * 1. Fetches script details first
 * 2. Uses supported_platforms to filter devices by OS
 * 3. Filters devices by status: ACTIVE and OFFLINE only
 */
export function useRunScriptData({ scriptId }: UseRunScriptDataOptions) {
  const { toast } = useToast()

  // Script state
  const [scriptDetails, setScriptDetails] = useState<ScriptDetails | null>(null)
  const [isLoadingScript, setIsLoadingScript] = useState(true)
  const [scriptError, setScriptError] = useState<string | null>(null)

  // Devices state
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState<any>(null)
  const [filteredCount, setFilteredCount] = useState(0)

  // Fetch script details
  const fetchScriptDetails = useCallback(async () => {
    if (!scriptId) {
      setScriptError('Script ID is required')
      setIsLoadingScript(false)
      return
    }

    try {
      setIsLoadingScript(true)
      setScriptError(null)

      const response = await tacticalApiClient.getScript(scriptId)

      if (response.ok && response.data) {
        setScriptDetails(response.data)
      } else {
        setScriptError(response.error || 'Failed to fetch script details')
      }
    } catch (err) {
      console.error('Error fetching script details:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setScriptError(errorMessage)
    } finally {
      setIsLoadingScript(false)
    }
  }, [scriptId])

  // Fetch devices with filters based on script's supported_platforms
  const fetchDevices = useCallback(async (searchTerm?: string, cursor?: string | null) => {
    if (!scriptDetails) return

    setIsLoadingDevices(true)
    setDevicesError(null)

    try {
      // Build filter based on script's supported_platforms
      const osTypes = mapPlatformsToOsTypes(scriptDetails.supported_platforms || [])

      const filter = {
        statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
        ...(osTypes.length > 0 && { osTypes })
      }

      const response = await apiClient.post<GraphQLResponse<{ devices: {
        edges: Array<{ node: DevicesGraphQLNode, cursor: string }>
        pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string, endCursor?: string }
        filteredCount: number
      }}>>('/api/graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter,
          pagination: { limit: 100, cursor: cursor || null },
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
      const transformedDevices: Device[] = nodes.map(createDeviceListItem)

      setDevices(transformedDevices)
      setPageInfo(graphqlResponse.data.devices.pageInfo)
      setFilteredCount(graphqlResponse.data.devices.filteredCount)
    } catch (error) {
      console.error('Error fetching devices:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch devices'
      setDevicesError(errorMessage)

      toast({
        title: 'Failed to Load Devices',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoadingDevices(false)
    }
  }, [scriptDetails, toast])

  const searchDevices = useCallback((searchTerm: string) => {
    fetchDevices(searchTerm)
  }, [fetchDevices])

  // Initial load: fetch script first
  useEffect(() => {
    fetchScriptDetails()
  }, [fetchScriptDetails])

  // When script is loaded, fetch devices
  useEffect(() => {
    if (scriptDetails && !isLoadingScript) {
      fetchDevices()
    }
  }, [scriptDetails, isLoadingScript, fetchDevices])

  return {
    // Script
    scriptDetails,
    isLoadingScript,
    scriptError,

    // Devices
    devices,
    isLoadingDevices,
    devicesError,
    pageInfo,
    filteredCount,

    // Actions
    searchDevices,
    fetchDevices,
    refetchScript: fetchScriptDetails
  }
}
