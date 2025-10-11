/**
 * Device normalization utilities
 * Provides consistent device data transformation across list and detail views
 */

import { Device, DeviceGraphQLNode, DevicesGraphQLNode, UnifiedUser } from '../types/device.types'
import { FleetHost } from '../types/fleet.types'

/**
 * Normalize a device node from GraphQL list query (devices connection)
 * Used by the devices list view
 */
export function normalizeDeviceListNode(node: DevicesGraphQLNode): Device {
  const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')

  return {
    // Legacy/tactical fields for UI compatibility
    agent_id: tactical?.agentToolId || node.machineId || node.id,
    hostname: node.hostname || node.displayName || '',
    site_name: '',
    client_name: node.organization?.name || '',
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
    local_ips: node.ip ? [node.ip] : [],
    make_model: [node.manufacturer, node.model].filter(Boolean).join(' '),
    physical_disks: [],
    custom_fields: [],
    serial_number: node.serialNumber || '',
    total_ram: '',

    // Computed fields used by UI
    id: node.id,
    machineId: node.machineId,
    displayName: node.displayName || node.hostname,
    organizationId: node.organization?.organizationId,
    organization: node.organization?.name,
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
}

/**
 * Normalize a device node from GraphQL single query with optional Tactical and Fleet data
 * Used by the device details view
 *
 * Data Priority (as specified):
 * - Fleet MDM data is prioritized for accuracy (timestamps, hardware specs)
 * - Tactical RMM data used as fallback
 * - GraphQL node data used as final fallback
 */
export function normalizeDeviceDetailNode(
  node: DeviceGraphQLNode,
  tacticalData?: any,
  fleetData?: FleetHost
): Device {
  const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')
  const fleet = node.toolConnections?.find(tc => tc.toolType === 'FLEET_MDM')

  // Extract logged in user from Fleet users array
  const loggedUser = fleetData?.users?.find(u => u.type === 'person') || fleetData?.users?.[0]

  // Create unified users array from Fleet and Tactical
  const unifiedUsers: UnifiedUser[] = []

  // Add Fleet users if available
  if (fleetData?.users && fleetData.users.length > 0) {
    fleetData.users.forEach(fleetUser => {
      unifiedUsers.push({
        username: fleetUser.username,
        uid: fleetUser.uid,
        type: fleetUser.type,
        groupname: fleetUser.groupname,
        shell: fleetUser.shell,
        isLoggedIn: fleetUser.username === loggedUser?.username,
        source: 'fleet'
      })
    })
  }

  // Add Tactical logged user if not already in Fleet users
  if (tacticalData?.logged_username &&
      !unifiedUsers.some(u => u.username === tacticalData.logged_username)) {
    unifiedUsers.push({
      username: tacticalData.logged_username,
      isLoggedIn: true,
      source: 'tactical'
    })
  }

  // Helper function to check if IP is private/local
  const isPrivateIP = (ip: string): boolean => {
    if (!ip) return false
    // IPv4 private ranges
    if (ip.startsWith('10.')) return true
    if (ip.startsWith('172.')) {
      const second = parseInt(ip.split('.')[1])
      if (second >= 16 && second <= 31) return true
    }
    if (ip.startsWith('192.168.')) return true
    if (ip.startsWith('127.')) return true
    if (ip.startsWith('169.254.')) return true
    // IPv6 private/local ranges
    if (ip.startsWith('fe80:')) return true
    if (ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true
    if (ip === '::1') return true
    return false
  }

  // Determine the actual public IP (filter out private IPs)
  let actualPublicIP = ''
  if (fleetData?.public_ip && !isPrivateIP(fleetData.public_ip)) {
    actualPublicIP = fleetData.public_ip
  } else if (tacticalData?.public_ip && !isPrivateIP(tacticalData.public_ip)) {
    actualPublicIP = tacticalData.public_ip
  }

  // Merge ALL IPs from Fleet and Tactical into unified array (for local_ips)
  // Fleet IPs go first as they are more accurate
  const unifiedIps: string[] = []
  const seenIps = new Set<string>()

  // Add Fleet primary_ip first (this is a LOCAL IP)
  if (fleetData?.primary_ip && !seenIps.has(fleetData.primary_ip)) {
    unifiedIps.push(fleetData.primary_ip)
    seenIps.add(fleetData.primary_ip)
  }

  // Add Fleet public_ip if it's actually public
  if (fleetData?.public_ip && !isPrivateIP(fleetData.public_ip) && !seenIps.has(fleetData.public_ip)) {
    unifiedIps.push(fleetData.public_ip)
    seenIps.add(fleetData.public_ip)
  }

  // Add Node IP
  if (node.ip && !seenIps.has(node.ip)) {
    unifiedIps.push(node.ip)
    seenIps.add(node.ip)
  }

  // Add Tactical IPs last (lower priority)
  if (tacticalData?.wmi_detail?.local_ips) {
    tacticalData.wmi_detail.local_ips.forEach((ip: string) => {
      if (!seenIps.has(ip)) {
        unifiedIps.push(ip)
        seenIps.add(ip)
      }
    })
  }
  if (tacticalData?.local_ips) {
    tacticalData.local_ips.split(',').map((ip: string) => ip.trim()).filter(Boolean).forEach((ip: string) => {
      if (!seenIps.has(ip)) {
        unifiedIps.push(ip)
        seenIps.add(ip)
      }
    })
  }
  if (tacticalData?.public_ip && !seenIps.has(tacticalData.public_ip)) {
    unifiedIps.push(tacticalData.public_ip)
    seenIps.add(tacticalData.public_ip)
  }

  return {
    // Legacy/tactical fields
    agent_id: fleet?.agentToolId || tactical?.agentToolId || node.machineId || node.id,
    // Prioritize Fleet hostname as more accurate
    hostname: fleetData?.hostname || node.hostname || tacticalData?.hostname || node.displayName || '',
    site_name: tacticalData?.site_name || '',
    client_name: node.organization?.name || tacticalData?.client_name || '',
    monitoring_type: node.type || tacticalData?.monitoring_type || '',
    description: node.displayName || fleetData?.hostname || tacticalData?.description || node.hostname || '',
    needs_reboot: !!tacticalData?.needs_reboot,
    pending_actions_count: tacticalData?.pending_actions_count || 0,
    // Prioritize Fleet status
    status: fleetData?.status || node.status || tacticalData?.status || 'UNKNOWN',
    overdue_text_alert: !!tacticalData?.overdue_text_alert,
    overdue_email_alert: !!tacticalData?.overdue_email_alert,
    overdue_dashboard_alert: !!tacticalData?.overdue_dashboard_alert,
    // Prioritize Fleet last_seen as more accurate (user specified)
    last_seen: fleetData?.seen_time || node.lastSeen || tacticalData?.last_seen || '',
    // Prioritize Fleet boot time (calculate from last_restarted_at)
    boot_time: fleetData?.last_restarted_at ? new Date(fleetData.last_restarted_at).getTime() / 1000 : (tacticalData?.boot_time || 0),
    checks: tacticalData?.checks || { total: 0, passing: 0, failing: 0, warning: 0, info: 0, has_failing_checks: false },
    maintenance_mode: !!tacticalData?.maintenance_mode,
    // Extract logged username from Fleet users array
    logged_username: loggedUser?.username || tacticalData?.logged_username || '',
    logged_in_username: loggedUser?.username || tacticalData?.logged_username || '',  // Alias for compatibility
    italic: !!tacticalData?.italic,
    block_policy_inheritance: !!tacticalData?.block_policy_inheritance,
    // Prioritize Fleet platform
    plat: fleetData?.platform || node.osType || tacticalData?.operating_system || '',
    goarch: tacticalData?.goarch || '',
    has_patches_pending: !!tacticalData?.has_patches_pending,
    // Use GraphQL agent version as primary source
    version: node.agentVersion || tacticalData?.version || fleetData?.osquery_version || '',
    // Prioritize Fleet OS
    operating_system: fleetData?.platform || node.osType || tacticalData?.operating_system || '',
    // Use actual public IP (filtered to exclude private IPs)
    public_ip: actualPublicIP,
    // Prioritize Fleet cpu_brand (normalize as user requested: "Apple M3 Max")
    cpu_model: fleetData?.cpu_brand ? [fleetData.cpu_brand] : (tacticalData?.cpu_model || []),
    graphics: tacticalData?.graphics || '',
    // Unified IP list from ALL sources (Fleet + Tactical)
    local_ips: unifiedIps,
    // Prioritize Fleet hardware model
    make_model: fleetData?.hardware_model || tacticalData?.make_model || [node.manufacturer, node.model].filter(Boolean).join(' '),
    disks: tacticalData?.disks || [],
    physical_disks: tacticalData?.physical_disks || [],
    custom_fields: tacticalData?.custom_fields || [],
    // Prioritize Fleet serial number
    serial_number: fleetData?.hardware_serial || node.serialNumber || tacticalData?.serial_number || '',
    // Convert Fleet memory from bytes to readable format
    total_ram: fleetData?.memory ? `${(fleetData.memory / (1024 ** 3)).toFixed(2)} GB` : (tacticalData?.total_ram || ''),

    // Computed fields - prioritize Fleet data for accuracy
    id: node.id,
    machineId: node.machineId,
    displayName: node.displayName || fleetData?.display_name || fleetData?.hostname || node.hostname || tacticalData?.description || tacticalData?.hostname,
    organizationId: node.organization?.organizationId,
    organization: node.organization?.name || tacticalData?.client_name,
    type: node.type,
    // Prioritize Fleet OS type
    osType: fleetData?.platform || node.osType || tacticalData?.operating_system,
    // Prioritize Fleet OS version
    osVersion: fleetData?.os_version || node.osVersion || tacticalData?.version,
    // Prioritize Fleet build
    osBuild: fleetData?.build || node.osBuild || tacticalData?.version,
    // Prioritize Fleet registration date
    registeredAt: fleetData?.last_enrolled_at || node.registeredAt || undefined,
    // Prioritize Fleet update timestamp (more accurate as per user)
    updatedAt: fleetData?.detail_updated_at || fleetData?.seen_time || node.updatedAt || node.lastSeen || tacticalData?.last_seen,
    // Prioritize Fleet manufacturer
    manufacturer: fleetData?.hardware_vendor || node.manufacturer || (tacticalData?.make_model?.split('\n')[0] || undefined),
    // Prioritize Fleet model
    model: fleetData?.hardware_model || node.model || tacticalData?.make_model?.trim(),
    // Prioritize Fleet UUID
    osUuid: fleetData?.uuid || node.osUuid,
    // Prioritize Fleet last seen (more accurate)
    lastSeen: fleetData?.seen_time || node.lastSeen || tacticalData?.last_seen,
    tags: node.tags || tacticalData?.custom_fields || [],
    // Prioritize Fleet primary_ip (local), then node IP, then first from unified list
    ip: fleetData?.primary_ip || node.ip || unifiedIps[0] || '',
    // Prioritize Fleet MAC
    macAddress: fleetData?.primary_mac || node.macAddress,
    // Use GraphQL agent version as primary source
    agentVersion: node.agentVersion || tacticalData?.version || fleetData?.osquery_version,
    // Prioritize Fleet serial number
    serialNumber: fleetData?.hardware_serial || node.serialNumber || tacticalData?.serial_number || tacticalData?.wmi_detail?.serialnumber,
    totalRam: fleetData?.memory ? `${(fleetData.memory / (1024 ** 3)).toFixed(2)} GB` : undefined,
    toolConnections: node.toolConnections,

    // Unified users array (compatible with Fleet and Tactical)
    users: unifiedUsers.length > 0 ? unifiedUsers : undefined,

    // Fleet MDM comprehensive data (all nested objects)
    fleet: fleetData ? {
      // Hardware - CPU (normalized as user requested)
      cpu_type: fleetData.cpu_type,
      cpu_subtype: fleetData.cpu_subtype,
      cpu_brand: fleetData.cpu_brand,
      cpu_physical_cores: fleetData.cpu_physical_cores,
      cpu_logical_cores: fleetData.cpu_logical_cores,

      // Hardware - Memory
      memory: fleetData.memory,

      // Network
      primary_ip: fleetData.primary_ip,
      primary_mac: fleetData.primary_mac,

      // Storage
      gigs_disk_space_available: fleetData.gigs_disk_space_available,
      percent_disk_space_available: fleetData.percent_disk_space_available,
      gigs_total_disk_space: fleetData.gigs_total_disk_space,
      disk_encryption_enabled: fleetData.disk_encryption_enabled,

      // System status
      uptime: fleetData.uptime,
      last_restarted_at: fleetData.last_restarted_at,
      last_enrolled_at: fleetData.last_enrolled_at,

      // Software & Versions
      osquery_version: fleetData.osquery_version,
      orbit_version: fleetData.orbit_version,
      fleet_desktop_version: fleetData.fleet_desktop_version,
      scripts_enabled: fleetData.scripts_enabled,
      software: fleetData.software,
      software_updated_at: fleetData.software_updated_at,

      // Users & Access (nested array)
      users: fleetData.users,

      // Batteries (nested array)
      batteries: fleetData.batteries,

      // MDM (nested object)
      mdm: fleetData.mdm,

      // Labels (nested array)
      labels: fleetData.labels,

      // Issues (nested object)
      issues: fleetData.issues,

      // Platform & OS
      platform: fleetData.platform,
      platform_like: fleetData.platform_like,
      build: fleetData.build,
      code_name: fleetData.code_name,

      // Identifiers
      uuid: fleetData.uuid,
      computer_name: fleetData.computer_name,
      hardware_serial: fleetData.hardware_serial,
      hardware_vendor: fleetData.hardware_vendor,
      hardware_model: fleetData.hardware_model,
      hardware_version: fleetData.hardware_version
    } : undefined
  }
}
