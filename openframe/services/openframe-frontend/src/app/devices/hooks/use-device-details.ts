'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { tacticalApiClient } from '@lib/tactical-api-client'
import { fleetApiClient } from '@lib/fleet-api-client'
import { apiClient } from '@lib/api-client'
import { Device, DeviceGraphQLNode, GraphQLResponse, Software, Battery, User, MDMInfo } from '../types/device.types'
import { GET_DEVICE_QUERY } from '../queries/devices-queries'
import { FleetHost } from '../types/fleet.types'

/**
 * Create Device object directly from API responses
 * No normalization layer - direct mapping
 */
function createDevice(
  node: DeviceGraphQLNode,
  tacticalData: any | null,
  fleetData: FleetHost | null
): Device {
  // Transform Fleet software to unified Software type
  const software: Software[] = fleetData?.software?.map(fs => ({
    id: fs.id,
    name: fs.name,
    version: fs.version,
    source: fs.source,
    vendor: fs.vendor || undefined,  // Normalize null to undefined
    bundle_identifier: fs.bundle_identifier,
    vulnerabilities: (fs.vulnerabilities || []).map(v => ({
      cve: v.cve,
      details_link: v.details_link,
      created_at: v.created_at
    })),
    installed_paths: fs.installed_paths,
    last_opened_at: fs.last_opened_at
  })) || []

  // Transform Fleet batteries to unified Battery type
  const batteries: Battery[] = fleetData?.batteries?.map(fb => ({
    cycle_count: fb.cycle_count,
    health: fb.health
  })) || []

  // Transform Fleet users to unified User type
  const users: User[] = fleetData?.users?.map(fu => ({
    username: fu.username,
    uid: fu.uid,
    type: fu.type,
    groupname: fu.groupname,
    shell: fu.shell,
    isLoggedIn: fu.type === 'person'
  })) || []

  // Transform Fleet MDM to unified MDMInfo type
  const mdm: MDMInfo | undefined = fleetData?.mdm ? {
    enrollment_status: fleetData.mdm.enrollment_status,
    server_url: fleetData.mdm.server_url,
    name: fleetData.mdm.name,
    encryption_key_available: fleetData.mdm.encryption_key_available,
    device_status: fleetData.mdm.device_status,
    pending_action: fleetData.mdm.pending_action,
    connected_to_fleet: fleetData.mdm.connected_to_fleet
  } : undefined

  // Helper to check if IP is private
  const isPrivateIP = (ip: string): boolean => {
    if (!ip) return false
    if (ip.startsWith('10.')) return true
    if (ip.startsWith('172.')) {
      const second = parseInt(ip.split('.')[1])
      if (second >= 16 && second <= 31) return true
    }
    if (ip.startsWith('192.168.')) return true
    if (ip.startsWith('127.')) return true
    if (ip.startsWith('169.254.')) return true
    if (ip.startsWith('fe80:')) return true
    if (ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true
    if (ip === '::1') return true
    return false
  }

  // Determine actual public IP (filter private IPs)
  let actualPublicIP = ''
  if (fleetData?.public_ip && !isPrivateIP(fleetData.public_ip)) {
    actualPublicIP = fleetData.public_ip
  } else if (tacticalData?.public_ip && !isPrivateIP(tacticalData.public_ip)) {
    actualPublicIP = tacticalData.public_ip
  }

  // Merge ALL IPs from Fleet and Tactical into unified array
  const local_ips: string[] = []
  const seenIps = new Set<string>()

  // Add Fleet primary_ip first (local IP)
  if (fleetData?.primary_ip && !seenIps.has(fleetData.primary_ip)) {
    local_ips.push(fleetData.primary_ip)
    seenIps.add(fleetData.primary_ip)
  }

  // Add Fleet public_ip if actually public
  if (fleetData?.public_ip && !isPrivateIP(fleetData.public_ip) && !seenIps.has(fleetData.public_ip)) {
    local_ips.push(fleetData.public_ip)
    seenIps.add(fleetData.public_ip)
  }

  // Add Node IP
  if (node.ip && !seenIps.has(node.ip)) {
    local_ips.push(node.ip)
    seenIps.add(node.ip)
  }

  // Add Tactical IPs
  if (tacticalData?.wmi_detail?.local_ips) {
    tacticalData.wmi_detail.local_ips.forEach((ip: string) => {
      if (!seenIps.has(ip)) {
        local_ips.push(ip)
        seenIps.add(ip)
      }
    })
  }
  if (tacticalData?.local_ips) {
    tacticalData.local_ips.split(',').map((ip: string) => ip.trim()).filter(Boolean).forEach((ip: string) => {
      if (!seenIps.has(ip)) {
        local_ips.push(ip)
        seenIps.add(ip)
      }
    })
  }
  if (tacticalData?.public_ip && !seenIps.has(tacticalData.public_ip)) {
    local_ips.push(tacticalData.public_ip)
    seenIps.add(tacticalData.public_ip)
  }

  // Extract logged in user
  const loggedUser = users.find(u => u.isLoggedIn) || users[0]

  return {
    // Core Identifiers
    id: node.id,
    machineId: node.machineId,
    hostname: fleetData?.hostname || node.hostname || tacticalData?.hostname,
    displayName: node.displayName || fleetData?.display_name || node.hostname || tacticalData?.description,

    // Hardware - CPU
    cpu_brand: fleetData?.cpu_brand,
    cpu_type: fleetData?.cpu_type,
    cpu_subtype: fleetData?.cpu_subtype,
    cpu_physical_cores: fleetData?.cpu_physical_cores,
    cpu_logical_cores: fleetData?.cpu_logical_cores,

    // Hardware - Memory
    memory: fleetData?.memory,
    totalRam: fleetData?.memory ? `${(fleetData.memory / (1024 ** 3)).toFixed(2)} GB` : tacticalData?.total_ram,
    total_ram: fleetData?.memory ? `${(fleetData.memory / (1024 ** 3)).toFixed(2)} GB` : tacticalData?.total_ram,

    // Hardware - Identifiers
    hardware_serial: fleetData?.hardware_serial,
    hardware_vendor: fleetData?.hardware_vendor,
    hardware_model: fleetData?.hardware_model,
    hardware_version: fleetData?.hardware_version,
    serial_number: fleetData?.hardware_serial || node.serialNumber || tacticalData?.serial_number,
    manufacturer: fleetData?.hardware_vendor || node.manufacturer || tacticalData?.make_model?.split('\n')[0],
    model: fleetData?.hardware_model || node.model || tacticalData?.make_model?.trim(),
    make_model: fleetData?.hardware_model || tacticalData?.make_model || [node.manufacturer, node.model].filter(Boolean).join(' '),

    // Storage
    gigs_disk_space_available: fleetData?.gigs_disk_space_available,
    percent_disk_space_available: fleetData?.percent_disk_space_available,
    gigs_total_disk_space: fleetData?.gigs_total_disk_space,
    disk_encryption_enabled: fleetData?.disk_encryption_enabled,
    disks: tacticalData?.disks,
    physical_disks: tacticalData?.physical_disks,

    // Network
    primary_ip: fleetData?.primary_ip,
    primary_mac: fleetData?.primary_mac,
    public_ip: actualPublicIP,
    local_ips,
    ip: fleetData?.primary_ip || node.ip || local_ips[0],
    macAddress: fleetData?.primary_mac || node.macAddress,

    // System Status
    status: node.status || fleetData?.status || tacticalData?.status || 'UNKNOWN',
    uptime: fleetData?.uptime,
    last_seen: fleetData?.seen_time || node.lastSeen || tacticalData?.last_seen,
    lastSeen: fleetData?.seen_time || node.lastSeen || tacticalData?.last_seen,
    last_restarted_at: fleetData?.last_restarted_at,
    last_enrolled_at: fleetData?.last_enrolled_at,
    boot_time: fleetData?.last_restarted_at ? new Date(fleetData.last_restarted_at).getTime() / 1000 : (tacticalData?.boot_time || 0),

    // Operating System
    platform: fleetData?.platform,
    platform_like: fleetData?.platform_like,
    os_version: fleetData?.os_version,
    build: fleetData?.build,
    code_name: fleetData?.code_name,
    operating_system: fleetData?.platform || node.osType || tacticalData?.operating_system,
    osType: fleetData?.platform || node.osType || tacticalData?.operating_system,
    osVersion: fleetData?.os_version || node.osVersion || tacticalData?.version,
    osBuild: fleetData?.build || node.osBuild,

    // Software & Versions
    osquery_version: fleetData?.osquery_version,
    orbit_version: fleetData?.orbit_version,
    fleet_desktop_version: fleetData?.fleet_desktop_version,
    scripts_enabled: fleetData?.scripts_enabled,
    agentVersion: node.agentVersion || tacticalData?.version || fleetData?.osquery_version,
    version: node.agentVersion || tacticalData?.version || fleetData?.osquery_version,

    // Unified Arrays (NO NESTING)
    software,
    batteries,
    users,

    // MDM Info
    mdm,

    // Organization
    organizationId: node.organization?.organizationId,
    organization: node.organization?.name || tacticalData?.client_name,
    organizationImageUrl: node.organization?.image?.imageUrl || null,

    // Tags
    tags: node.tags || tacticalData?.custom_fields || [],

    // Tool Connections
    toolConnections: node.toolConnections,
    installedAgents: node.installedAgents,

    // Misc
    type: node.type || tacticalData?.monitoring_type,
    registeredAt: fleetData?.last_enrolled_at || node.registeredAt,
    updatedAt: fleetData?.detail_updated_at || fleetData?.seen_time || node.updatedAt || node.lastSeen || tacticalData?.last_seen,
    osUuid: fleetData?.uuid || node.osUuid,

    // Reference IDs
    fleetId: fleetData?.id,
    tacticalAgentId: tacticalData?.agent_id,
    agent_id: tacticalData?.agent_id || node.machineId || node.id,

    // Graphics
    graphics: tacticalData?.graphics,

    // Legacy fields
    serialNumber: fleetData?.hardware_serial || node.serialNumber || tacticalData?.serial_number,
    description: node.displayName || fleetData?.hostname || tacticalData?.description || node.hostname,
    plat: fleetData?.platform || node.osType || tacticalData?.operating_system,
    logged_in_username: loggedUser?.username || tacticalData?.logged_username,
    logged_username: loggedUser?.username || tacticalData?.logged_username,

    // Legacy tactical fields for compatibility
    cpu_model: fleetData?.cpu_brand ? [fleetData.cpu_brand] : (tacticalData?.cpu_model || []),
    site_name: tacticalData?.site_name || '',
    client_name: node.organization?.name || tacticalData?.client_name || '',
    monitoring_type: node.type || tacticalData?.monitoring_type || '',
    needs_reboot: tacticalData?.needs_reboot || false,
    pending_actions_count: tacticalData?.pending_actions_count || 0,
    overdue_text_alert: tacticalData?.overdue_text_alert || false,
    overdue_email_alert: tacticalData?.overdue_email_alert || false,
    overdue_dashboard_alert: tacticalData?.overdue_dashboard_alert || false,
    checks: tacticalData?.checks || { total: 0, passing: 0, failing: 0, warning: 0, info: 0, has_failing_checks: false },
    maintenance_mode: tacticalData?.maintenance_mode || false,
    italic: tacticalData?.italic || false,
    block_policy_inheritance: tacticalData?.block_policy_inheritance || false,
    goarch: tacticalData?.goarch || '',
    has_patches_pending: tacticalData?.has_patches_pending || false,
    custom_fields: tacticalData?.custom_fields || []
  }
}

export function useDeviceDetails() {
  const { toast } = useToast()
  const [deviceDetails, setDeviceDetails] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const isPollingRef = useRef(false)

  const fetchDeviceById = useCallback(async (machineId: string, silent = false) => {
    if (!machineId) {
      setError('machineId is required')
      return
    }

    // Only show loading state for initial (non-silent) fetches
    if (!silent) {
      setIsLoading(true)
    }
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

      // 2.5) Fetch Fleet MDM details if present
      const fleet = node.toolConnections?.find(tc => tc.toolType === 'FLEET_MDM')
      let fleetData: any | null = null
      if (fleet?.agentToolId) {
        // Validate that agentToolId is a valid numeric string before calling Fleet API
        const fleetHostId = Number(fleet.agentToolId)
        if (Number.isInteger(fleetHostId) && fleetHostId > 0) {
          const fResponse = await fleetApiClient.getHost(fleetHostId)
          if (fResponse.ok && fResponse.data?.host) {
            fleetData = fResponse.data.host
          }
        } else {
          console.warn(`Invalid Fleet host ID format: "${fleet.agentToolId}" - expected numeric ID`)
        }
      }

      // 3) Create Device object directly - no normalization
      const merged: Device = createDevice(node, tacticalData, fleetData)

      setDeviceDetails(merged)
      setLastUpdated(Date.now())

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch device details'
      setError(errorMessage)

      // Only show toast for initial (non-silent) fetches
      if (!silent) {
        toast({
          title: "Failed to Load Device Details",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [toast])

  const clearDeviceDetails = useCallback(() => {
    setDeviceDetails(null)
    setError(null)
    setLastUpdated(null)
  }, [])

  // Polling logic with adaptive intervals
  useEffect(() => {
    if (!deviceDetails?.machineId) return

    // Extract agent IDs from toolConnections
    const tacticalAgentId = deviceDetails.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')?.agentToolId
    const meshcentralAgentId = deviceDetails.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId

    // Adaptive interval based on agent connection status
    // Fast polling (5s) when agents are missing, slow polling (10s) when all connected
    const hasAllAgents = Boolean(tacticalAgentId && meshcentralAgentId)
    const pollingInterval = hasAllAgents ? 10000 : 5000 // 10s or 5s

    isPollingRef.current = true

    const intervalId = setInterval(() => {
      if (isPollingRef.current) {
        // Silent refresh - no loading states or error toasts
        fetchDeviceById(deviceDetails.machineId, true)
      }
    }, pollingInterval)

    return () => {
      clearInterval(intervalId)
      isPollingRef.current = false
    }
  }, [deviceDetails?.machineId, deviceDetails?.toolConnections, fetchDeviceById])

  return {
    deviceDetails,
    isLoading,
    error,
    fetchDeviceById,
    clearDeviceDetails,
    lastUpdated
  }
}