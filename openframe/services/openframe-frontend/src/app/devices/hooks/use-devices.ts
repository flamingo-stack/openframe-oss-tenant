'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { Device, DeviceFilters, DeviceFilterInput } from '../types/device.types'

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
      const response = await tacticalApiClient.getAgents()

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      if (!response.data) {
        throw new Error('No data received from server')
      }

      const transformedDevices = response.data.map(agent => ({
        ...agent,
        displayName: agent.description || agent.hostname,
        organizationId: agent.client_name,
        organization: agent.client_name,
        type: agent.monitoring_type?.toUpperCase() || 'UNKNOWN',
        osType: agent.operating_system,
        osVersion: agent.version,
        osBuild: agent.version,
        registeredAt: agent.last_seen,
        updatedAt: agent.last_seen,
        manufacturer: agent.make_model?.split('\n')[0] || 'Unknown',
        model: agent.make_model?.trim() || 'Unknown',
        osUuid: undefined,
        machineId: agent.agent_id,
        // Extract IP from local_ips (first IP)
        ip: agent.local_ips?.split(',')[0]?.trim() || agent.public_ip,
        macAddress: undefined,
        agentVersion: agent.version,
        disks: agent.disks || [],
        serialNumber: agent.serial_number,
        totalRam: agent.total_ram,
        tags: []
      }))

      let filteredDevices = transformedDevices

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filteredDevices = filteredDevices.filter(device => 
          device.displayName?.toLowerCase().includes(term) ||
          device.hostname.toLowerCase().includes(term) ||
          device.agent_id.toLowerCase().includes(term) ||
          device.client_name?.toLowerCase().includes(term) ||
          device.logged_username?.toLowerCase().includes(term)
        )
      }
      
      if (filtersRef.current.statuses?.length) {
        filteredDevices = filteredDevices.filter(device => {
          const mappedStatus = device.status === 'online' ? 'ACTIVE' : 
                             device.status === 'offline' ? 'DECOMMISSIONED' :
                             device.status === 'idle' ? 'MAINTENANCE' : 
                             device.status.toUpperCase()
          return filtersRef.current.statuses!.includes(mappedStatus) || filtersRef.current.statuses!.includes(device.status.toUpperCase())
        })
      }
      
      if (filtersRef.current.deviceTypes?.length) {
        filteredDevices = filteredDevices.filter(device => 
          device.type && filtersRef.current.deviceTypes!.includes(device.type)
        )
      }
      
      if (filtersRef.current.osTypes?.length) {
        filteredDevices = filteredDevices.filter(device => 
          filtersRef.current.osTypes!.includes(device.operating_system)
        )
      }

      setDevices(filteredDevices)
      
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
      const response = await tacticalApiClient.getAgents()

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      if (response.data) {
        const devices = response.data
        
        const statusCounts = new Map<string, number>()
        const deviceTypeCounts = new Map<string, number>()
        const osTypeCounts = new Map<string, number>()
        const clientCounts = new Map<string, number>()
        const tagCounts = new Map<string, { value: string; label: string; count: number }>()

        devices.forEach(device => {
          const status = device.status === 'online' ? 'ACTIVE' : 
                        device.status === 'offline' ? 'DECOMMISSIONED' :
                        device.status === 'idle' ? 'MAINTENANCE' : 
                        device.status.toUpperCase()
          statusCounts.set(status, (statusCounts.get(status) || 0) + 1)

          const deviceType = device.monitoring_type?.toUpperCase() || 'UNKNOWN'
          deviceTypeCounts.set(deviceType, (deviceTypeCounts.get(deviceType) || 0) + 1)

          const osName = device.operating_system.split(' ')[0] || device.operating_system
          osTypeCounts.set(osName, (osTypeCounts.get(osName) || 0) + 1)

          if (device.client_name) {
            clientCounts.set(device.client_name, (clientCounts.get(device.client_name) || 0) + 1)
          }
        })

        const statuses = Array.from(statusCounts.entries()).map(([value, count]) => ({ value, count }))
        const deviceTypes = Array.from(deviceTypeCounts.entries()).map(([value, count]) => ({ value, count }))
        const osTypes = Array.from(osTypeCounts.entries()).map(([value, count]) => ({ value, count }))
        const organizationIds = Array.from(clientCounts.entries()).map(([value, count]) => ({ value, count }))
        const tags = Array.from(tagCounts.values())

        setDeviceFilters({
          statuses,
          deviceTypes,
          osTypes,
          organizationIds,
          tags,
          filteredCount: devices.length
        })
      }
      
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