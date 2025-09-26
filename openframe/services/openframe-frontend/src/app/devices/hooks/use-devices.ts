'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { Device, DeviceFilters, DeviceFilterInput, DevicesGraphQLNode, GraphQLResponse } from '../types/device.types'
import { GET_DEVICES_QUERY, GET_DEVICE_FILTERS_QUERY } from '../queries/devices-queries'

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
      }}>>('graphql', {
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

      const transformedDevices: Device[] = nodes.map(node => {
        const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')
        return {
          // legacy/tactical fields for UI compatibility
          agent_id: tactical?.agentToolId || node.machineId || node.id,
          hostname: node.hostname || node.displayName || '',
          site_name: '',
          client_name: node.organizationId || '',
          monitoring_type: node.type || '',
          description: node.displayName || node.hostname || '',
          needs_reboot: false,
          pending_actions_count: 0,
          status: node.status || 'UNKNOWN',
          overdue_text_alert: false,
          overdue_email_alert: false,
          overdue_dashboard_alert: false,
          last_seen: node.lastSeen || '',
          boot_time: 0,
          checks: { total: 0, passing: 0, failing: 0, warning: 0, info: 0, has_failing_checks: false },
          maintenance_mode: false,
          logged_username: '',
          italic: false,
          block_policy_inheritance: false,
          plat: node.osType || '',
          goarch: '',
          has_patches_pending: false,
          version: node.agentVersion || '',
          operating_system: node.osType || '',
          public_ip: '',
          cpu_model: [],
          graphics: '',
          local_ips: node.ip || '',
          make_model: [node.manufacturer, node.model].filter(Boolean).join(' '),
          physical_disks: [],
          custom_fields: [],
          serial_number: node.serialNumber || '',
          total_ram: '',

          // computed fields used by UI
          id: node.id,
          machineId: node.machineId,
          displayName: node.displayName || node.hostname,
          organizationId: node.organizationId,
          organization: node.organizationId,
          type: node.type,
          osType: node.osType,
          osVersion: node.osVersion,
          osBuild: node.osBuild,
          registeredAt: node.registeredAt,
          updatedAt: node.updatedAt,
          manufacturer: node.manufacturer,
          model: node.model,
          osUuid: node.osUuid,
          lastSeen: node.lastSeen,
          tags: node.tags || [],
          ip: node.ip,
          macAddress: node.macAddress,
          agentVersion: node.agentVersion,
          serialNumber: node.serialNumber,
          totalRam: undefined,
          toolConnections: node.toolConnections
        }
      })

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
      const response = await apiClient.post<GraphQLResponse<{ deviceFilters: DeviceFilters }>>('graphql', {
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
  }, [])

  const refreshDevices = useCallback(() => {
    fetchDevices()
    fetchDeviceFilters()
  }, [])

  useEffect(() => {
    fetchDevices()
    fetchDeviceFilters()
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