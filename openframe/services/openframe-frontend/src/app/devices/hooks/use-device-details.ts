'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { apiClient } from '@lib/api-client'
import { Device, DeviceGraphQLNode, GraphQLResponse } from '../types/device.types'
import { GET_DEVICE_QUERY } from '../queries/devices-queries'

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
      const response = await apiClient.post<GraphQLResponse<{ device: DeviceGraphQLNode }>>('graphql', {
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

      // 3) Merge details giving precedence to GraphQL canonical fields
      const merged: Device = {
        // legacy/tactical fields
        agent_id: tactical?.agentToolId || node.machineId || node.id,
        hostname: node.hostname || tacticalData?.hostname || node.displayName || '',
        site_name: tacticalData?.site_name || '',
        client_name: node.organizationId || tacticalData?.client_name || '',
        monitoring_type: node.type || tacticalData?.monitoring_type || '',
        description: node.displayName || tacticalData?.description || node.hostname || '',
        needs_reboot: !!tacticalData?.needs_reboot,
        pending_actions_count: tacticalData?.pending_actions_count || 0,
        status: node.status || tacticalData?.status || 'UNKNOWN',
        overdue_text_alert: !!tacticalData?.overdue_text_alert,
        overdue_email_alert: !!tacticalData?.overdue_email_alert,
        overdue_dashboard_alert: !!tacticalData?.overdue_dashboard_alert,
        last_seen: node.lastSeen || tacticalData?.last_seen || '',
        boot_time: tacticalData?.boot_time || 0,
        checks: tacticalData?.checks || { total: 0, passing: 0, failing: 0, warning: 0, info: 0, has_failing_checks: false },
        maintenance_mode: !!tacticalData?.maintenance_mode,
        logged_username: tacticalData?.logged_username || '',
        italic: !!tacticalData?.italic,
        block_policy_inheritance: !!tacticalData?.block_policy_inheritance,
        plat: node.osType || tacticalData?.operating_system || '',
        goarch: tacticalData?.goarch || '',
        has_patches_pending: !!tacticalData?.has_patches_pending,
        version: node.agentVersion || tacticalData?.version || '',
        operating_system: node.osType || tacticalData?.operating_system || '',
        public_ip: tacticalData?.public_ip || '',
        cpu_model: tacticalData?.cpu_model || [],
        graphics: tacticalData?.graphics || '',
        local_ips: tacticalData?.local_ips || node.ip || '',
        make_model: tacticalData?.make_model || [node.manufacturer, node.model].filter(Boolean).join(' '),
        disks: tacticalData?.disks || [],
        physical_disks: tacticalData?.physical_disks || [],
        custom_fields: tacticalData?.custom_fields || [],
        serial_number: node.serialNumber || tacticalData?.serial_number || '',
        total_ram: tacticalData?.total_ram || '',

        // computed fields
        id: node.id,
        machineId: node.machineId,
        displayName: node.displayName || node.hostname || tacticalData?.description || tacticalData?.hostname,
        organizationId: node.organizationId,
        organization: node.organizationId || tacticalData?.client_name,
        type: node.type,
        osType: node.osType || tacticalData?.operating_system,
        osVersion: node.osVersion || tacticalData?.version,
        osBuild: node.osBuild || tacticalData?.version,
        registeredAt: node.registeredAt || tacticalData?.last_seen,
        updatedAt: node.updatedAt || tacticalData?.last_seen,
        manufacturer: node.manufacturer || (tacticalData?.make_model?.split('\n')[0] || undefined),
        model: node.model || tacticalData?.make_model?.trim(),
        osUuid: node.osUuid,
        lastSeen: node.lastSeen || tacticalData?.last_seen,
        tags: node.tags || tacticalData?.custom_fields || [],
        ip: node.ip || tacticalData?.local_ips?.split(',')[0]?.trim() || tacticalData?.public_ip,
        macAddress: node.macAddress,
        agentVersion: node.agentVersion || tacticalData?.version,
        serialNumber: node.serialNumber || tacticalData?.serial_number || tacticalData?.wmi_detail?.serialnumber,
        totalRam: undefined,
        toolConnections: node.toolConnections
      }

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