'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { Device } from '../types/device.types'

export function useDeviceDetails() {
  const { toast } = useToast()
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDeviceById = useCallback(async (deviceId: string) => {
    if (!deviceId) {
      setError('Device ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await tacticalApiClient.getAgent(deviceId)

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      if (!response.data) {
        setDeviceDetails(null)
        setError('Device not found')
        return
      }

      const transformedDevice = {
        ...response.data,
        // Map tactical-rmm fields
        displayName: response.data.description || response.data.hostname,
        organizationId: response.data.client_name,
        organization: response.data.client_name,
        type: response.data.monitoring_type?.toUpperCase() || 'UNKNOWN',
        osType: response.data.operating_system,
        osVersion: response.data.version,
        osBuild: response.data.version,
        registeredAt: response.data.last_seen,
        updatedAt: response.data.last_seen,
        serialNumber: response.data.serial_number || response.data.wmi_detail?.serialnumber,
        totalRam: response.data.total_ram,
        serial_number: response.data.serial_number || response.data.wmi_detail?.serialnumber,
        total_ram: response.data.total_ram,
        manufacturer: response.data.make_model?.split('\n')[0] || 'Unknown',
        model: response.data.make_model?.trim() || 'Unknown',
        osUuid: undefined,
        machineId: response.data.agent_id,
        id: response.data.agent_id,
        lastSeen: response.data.last_seen,
        tags: response.data.custom_fields || [],
        disks: response.data.disks || []
      }

      setDeviceDetails(transformedDevice)
      
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