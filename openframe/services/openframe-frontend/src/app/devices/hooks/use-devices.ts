'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { Device, DeviceFilters, DeviceFilterInput, DevicesGraphQLNode, GraphQLResponse } from '../types/device.types'
import { GET_DEVICES_QUERY, GET_DEVICE_FILTERS_QUERY } from '../queries/devices-queries'

/**
 * Create Device list item directly from GraphQL node
 * For list view - lightweight, no external API calls
 */
function createDeviceListItem(node: DevicesGraphQLNode): Device {
  const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')

  return {
    // Core Identifiers
    id: node.id,
    machineId: node.machineId || node.id,
    hostname: node.hostname || node.displayName || '',
    displayName: node.displayName || node.hostname,

    // Hardware - CPU (not available in list view)
    cpu_brand: undefined,
    cpu_type: undefined,
    cpu_physical_cores: undefined,
    cpu_logical_cores: undefined,

    // Hardware - Memory (not available in list view)
    memory: undefined,
    totalRam: undefined,

    // Hardware - Identifiers
    hardware_serial: node.serialNumber,
    hardware_vendor: node.manufacturer,
    hardware_model: node.model,
    serial_number: node.serialNumber,
    manufacturer: node.manufacturer,
    model: node.model,

    // Storage (not available in list view)
    gigs_disk_space_available: undefined,
    percent_disk_space_available: undefined,
    gigs_total_disk_space: undefined,
    disk_encryption_enabled: undefined,
    disks: undefined,

    // Network
    primary_ip: node.ip,
    primary_mac: node.macAddress,
    public_ip: undefined,
    local_ips: node.ip ? [node.ip] : [],
    ip: node.ip,
    macAddress: node.macAddress,

    // System Status
    status: node.status,
    uptime: undefined,
    last_seen: node.lastSeen,
    lastSeen: node.lastSeen,
    last_restarted_at: undefined,
    last_enrolled_at: node.registeredAt,
    boot_time: undefined,

    // Operating System
    platform: node.osType,
    platform_like: undefined,
    os_version: node.osVersion,
    build: node.osBuild,
    code_name: undefined,
    operating_system: node.osType,
    osType: node.osType,
    osVersion: node.osVersion,
    osBuild: node.osBuild,

    // Software & Versions
    osquery_version: undefined,
    orbit_version: undefined,
    fleet_desktop_version: undefined,
    scripts_enabled: undefined,
    agentVersion: node.agentVersion,

    // Unified Arrays (not available in list view)
    software: undefined,
    batteries: undefined,
    users: undefined,

    // MDM Info (not available in list view)
    mdm: undefined,

    // Organization
    organizationId: node.organization?.organizationId,
    organization: node.organization?.name,

    // Tags
    tags: node.tags,

    // Tool Connections
    toolConnections: node.toolConnections,

    // Misc
    type: node.type,
    registeredAt: node.registeredAt,
    updatedAt: node.updatedAt,
    osUuid: node.osUuid,

    // Reference IDs
    fleetId: undefined,
    tacticalAgentId: tactical?.agentToolId,

    // Graphics
    graphics: undefined
  }
}

export function useDevices(filters: DeviceFilterInput = {}) {
  const { toast } = useToast()
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceFilters, setDeviceFilters] = useState<DeviceFilters | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState<any>(null)
  const [filteredCount, setFilteredCount] = useState(0)
  const [hasLoadedBeyondFirst, setHasLoadedBeyondFirst] = useState(false)
  
  const stableFilters = useMemo(() => filters, [JSON.stringify(filters)])
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
          pagination: { limit: 20, cursor: cursor || null },
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

  useEffect(() => {
    if (initialLoadDone.current) {
      fetchDevices()
      fetchDeviceFilters()
    }
  }, [stableFilters, fetchDevices, fetchDeviceFilters])

  return {
    devices,
    deviceFilters,
    isLoading,
    error,
    searchDevices,
    refreshDevices,
    fetchDevices,
    pageInfo,
    filteredCount,
    fetchNextPage,
    fetchFirstPage,
    hasLoadedBeyondFirst
  }
}