import { Device, DevicesGraphQlNode } from '../types/device.types';

/**
 * Create Device list item directly from GraphQL node
 * For list view - lightweight, no external API calls
 */
export function createDeviceListItem(node: DevicesGraphQlNode): Device {
  const tactical = node.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM');

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
    organizationImageUrl: node.organization?.image?.imageUrl || null,

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
    graphics: undefined,
  };
}
