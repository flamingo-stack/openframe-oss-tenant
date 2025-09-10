'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@/lib/api-client'
import { GET_DEVICES_QUERY } from '../queries/devices-queries'

interface DeviceTag {
  id: string
  name: string
  description?: string
  color?: string
  organizationId: string
  createdAt: string
  createdBy: string
  __typename?: string
}

interface Device {
  id: string
  machineId: string
  hostname: string
  displayName: string
  ip: string
  macAddress: string
  osUuid?: string
  agentVersion?: string
  status: string
  lastSeen: string
  organizationId: string
  serialNumber?: string
  manufacturer?: string
  model?: string
  type?: string
  osType: string
  osVersion?: string
  osBuild?: string
  timezone?: string
  registeredAt: string
  updatedAt: string
  tags: DeviceTag[]
  __typename?: string
}

interface DevicesResponse {
  devices: {
    edges: Array<{
      node: Device
      cursor: string
      __typename: string
    }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
      __typename: string
    }
    filteredCount: number
    __typename: string
  }
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export function useDeviceDetails() {
  const { toast } = useToast()
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDeviceByMachineId = useCallback(async (machineId: string) => {
    if (!machineId) {
      setError('Machine ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<GraphQLResponse<DevicesResponse>>('graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter: null,
          pagination: { limit: 1 },
          search: machineId
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

      const devices = graphqlResponse.data.devices.edges
      if (devices.length === 0) {
        setDeviceDetails(null)
        setError('Device not found')
        return
      }

      // Find exact match by machineId or use first result
      const device = devices.find(edge => 
        edge.node.machineId === machineId || 
        edge.node.id === machineId ||
        edge.node.hostname === machineId
      )?.node || devices[0].node

      setDeviceDetails(device)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch device details'
      setError(errorMessage)
      
      toast({
        title: "Failed to Load Device Details",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const clearDeviceDetails = useCallback(() => {
    setDeviceDetails(null)
    setError(null)
  }, [])

  return {
    deviceDetails,
    isLoading,
    error,
    fetchDeviceByMachineId,
    clearDeviceDetails
  }
}