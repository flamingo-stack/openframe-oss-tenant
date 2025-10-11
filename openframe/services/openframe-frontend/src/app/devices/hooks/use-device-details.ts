'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { apiClient } from '@lib/api-client'
import { Device, DeviceGraphQLNode, GraphQLResponse } from '../types/device.types'
import { GET_DEVICE_QUERY } from '../queries/devices-queries'
import { normalizeDeviceDetailNode } from '../utils/normalize-device'

export function useDeviceDetails() {
  const { toast } = useToast()
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDeviceById = useCallback(async (machineId: string) => {
    if (!machineId) {
      setError('machineId is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1) Fetch primary device from GraphQL
      const response = await apiClient.post<GraphQLResponse<{ device: DeviceGraphQLNode }>>('/api/graphql', {
        query: GET_DEVICE_QUERY,
        variables: { machineId }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data
      if (!graphqlResponse?.data?.device) {
        setDeviceDetails(null)
        setError('Device not found')
        return
      }
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      const node = graphqlResponse.data.device

      // 2) Use toolConnections to fetch Tactical details if present
      const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')
      let tacticalData: any | null = null
      if (tactical?.agentToolId) {
        const tResponse = await tacticalApiClient.getAgent(tactical.agentToolId)
        if (tResponse.ok) {
          tacticalData = tResponse.data
        }
      }

      // 3) Use shared normalization function for consistency
      const merged: Device = normalizeDeviceDetailNode(node, tacticalData)

      setDeviceDetails(merged)
      
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
    fetchDeviceById,
    clearDeviceDetails
  }
}