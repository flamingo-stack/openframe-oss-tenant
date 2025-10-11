/**
 * Device normalization utilities
 * Provides consistent device data transformation across list and detail views
 */

import { Device, DeviceGraphQLNode, DevicesGraphQLNode } from '../types/device.types'

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
 * Normalize a device node from GraphQL single query with optional Tactical data
 * Used by the device details view
 */
export function normalizeDeviceDetailNode(
  node: DeviceGraphQLNode,
  tacticalData?: any
): Device {
  const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')

  return {
    // Legacy/tactical fields
    agent_id: tactical?.agentToolId || node.machineId || node.id,
    hostname: node.hostname || tacticalData?.hostname || node.displayName || '',
    site_name: tacticalData?.site_name || '',
    client_name: node.organization?.name || tacticalData?.client_name || '',
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
    local_ips: tacticalData?.wmi_detail?.local_ips ||
      (tacticalData?.local_ips ? tacticalData.local_ips.split(',').map((ip: string) => ip.trim()).filter(Boolean) : []) ||
      (node.ip ? [node.ip] : []),
    make_model: tacticalData?.make_model || [node.manufacturer, node.model].filter(Boolean).join(' '),
    disks: tacticalData?.disks || [],
    physical_disks: tacticalData?.physical_disks || [],
    custom_fields: tacticalData?.custom_fields || [],
    serial_number: node.serialNumber || tacticalData?.serial_number || '',
    total_ram: tacticalData?.total_ram || '',

    // Computed fields - consistent with list view
    id: node.id,
    machineId: node.machineId,
    displayName: node.displayName || node.hostname || tacticalData?.description || tacticalData?.hostname,
    organizationId: node.organization?.organizationId,
    organization: node.organization?.name || tacticalData?.client_name,
    type: node.type,
    osType: node.osType || tacticalData?.operating_system,
    osVersion: node.osVersion || tacticalData?.version,
    osBuild: node.osBuild || tacticalData?.version,
    registeredAt: node.registeredAt || undefined,
    updatedAt: node.updatedAt || node.lastSeen || tacticalData?.last_seen,
    manufacturer: node.manufacturer || (tacticalData?.make_model?.split('\n')[0] || undefined),
    model: node.model || tacticalData?.make_model?.trim(),
    osUuid: node.osUuid,
    lastSeen: node.lastSeen || tacticalData?.last_seen,
    tags: node.tags || tacticalData?.custom_fields || [],
    ip: node.ip || tacticalData?.wmi_detail?.local_ips?.[0] || tacticalData?.local_ips?.split(',')[0]?.trim() || tacticalData?.public_ip,
    macAddress: node.macAddress,
    agentVersion: node.agentVersion || tacticalData?.version,
    serialNumber: node.serialNumber || tacticalData?.serial_number || tacticalData?.wmi_detail?.serialnumber,
    totalRam: undefined,
    toolConnections: node.toolConnections
  }
}
