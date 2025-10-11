/**
 * Shared Device types for the devices module
 */

import {
  FleetSoftware,
  FleetUser,
  FleetBattery,
  FleetLabel,
  FleetMDMInfo,
  FleetIssues
} from './fleet.types'

/**
 * Unified User type compatible with both Fleet and Tactical
 */
export interface UnifiedUser {
  username: string
  uid?: number          // From Fleet
  type?: string         // From Fleet (person, service, etc.)
  groupname?: string    // From Fleet
  shell?: string        // From Fleet
  isLoggedIn?: boolean  // Computed field
  source: 'fleet' | 'tactical' | 'unknown'
}

export interface DeviceTag {
  id: string
  name: string
  description?: string
  color?: string
  organizationId: string
  createdAt: string
  createdBy: string
  __typename?: string
}

export type ToolType = 'MESHCENTRAL' | 'TACTICAL_RMM' | 'FLEET_MDM'

export interface ToolConnection {
  id: string
  machineId: string
  toolType: ToolType
  agentToolId: string
  status: string
  metadata?: any
  connectedAt?: string
  lastSyncAt?: string
  disconnectedAt?: string
  __typename?: string
}

export interface Device {
  // Core tactical-rmm fields
  agent_id: string
  hostname: string
  site_name: string
  client_name: string
  monitoring_type: string
  description: string
  needs_reboot: boolean
  pending_actions_count: number
  status: string
  overdue_text_alert: boolean
  overdue_email_alert: boolean
  overdue_dashboard_alert: boolean
  last_seen: string
  boot_time: number
  checks: {
    total: number
    passing: number
    failing: number
    warning: number
    info: number
    has_failing_checks: boolean
  }
  maintenance_mode: boolean
  logged_username: string
  logged_in_username?: string  // Alias for logged_username
  italic: boolean
  block_policy_inheritance: boolean
  plat: string
  goarch: string
  has_patches_pending: boolean
  version: string
  operating_system: string
  public_ip: string
  cpu_model: string[]
  graphics: string
  local_ips: string[]
  make_model: string
  physical_disks: string[]
  custom_fields: any[]
  serial_number: string
  total_ram: string
  
  // Disk information
  disks?: Array<{
    free: string
    used: string
    total: string
    device: string
    fstype: string
    percent: number
  }>

  // Fleet MDM specific fields
  fleet?: {
    // Hardware - CPU
    cpu_type?: string
    cpu_subtype?: string
    cpu_brand?: string
    cpu_physical_cores?: number
    cpu_logical_cores?: number

    // Hardware - Memory
    memory?: number  // in bytes

    // Network
    primary_ip?: string
    primary_mac?: string

    // Storage
    gigs_disk_space_available?: number
    percent_disk_space_available?: number
    gigs_total_disk_space?: number
    disk_encryption_enabled?: boolean

    // System status
    uptime?: number  // in seconds
    last_restarted_at?: string
    last_enrolled_at?: string

    // Software & Versions
    osquery_version?: string
    orbit_version?: string
    fleet_desktop_version?: string
    scripts_enabled?: boolean
    software?: FleetSoftware[]
    software_updated_at?: string

    // Users & Access
    users?: FleetUser[]

    // Batteries
    batteries?: FleetBattery[]

    // MDM
    mdm?: FleetMDMInfo

    // Labels
    labels?: FleetLabel[]

    // Issues
    issues?: FleetIssues

    // Platform & OS
    platform?: string
    platform_like?: string
    build?: string
    code_name?: string

    // Identifiers
    uuid?: string
    computer_name?: string
    hardware_serial?: string
    hardware_vendor?: string
    hardware_model?: string
    hardware_version?: string
  }

  // Computed fields for display compatibility
  displayName?: string
  organizationId?: string
  organization?: string
  type?: string
  osType?: string
  osVersion?: string
  osBuild?: string
  registeredAt?: string
  updatedAt?: string
  manufacturer?: string
  model?: string
  osUuid?: string
  machineId?: string
  id?: string
  lastSeen?: string
  tags?: DeviceTag[]
  ip?: string
  macAddress?: string
  agentVersion?: string
  serialNumber?: string
  totalRam?: string
  toolConnections?: ToolConnection[]

  // Unified users array (normalized from Fleet and Tactical)
  users?: UnifiedUser[]
}

// Additional types for device filtering
export interface DeviceFilterValue {
  value: string
  count: number
  __typename?: string
}

export interface DeviceFilterTag {
  value: string
  label: string
  count: number
  __typename?: string
}

export interface DeviceFilters {
  statuses: DeviceFilterValue[]
  deviceTypes: DeviceFilterValue[]
  osTypes: DeviceFilterValue[]
  organizationIds: DeviceFilterValue[]
  tags: DeviceFilterTag[]
  filteredCount: number
  __typename?: string
}

export interface DeviceFilterInput {
  statuses?: string[]
  deviceTypes?: string[]
  osTypes?: string[]
  organizationIds?: string[]
  tags?: string[]
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export type DevicesGraphQLNode = {
  id: string
  machineId?: string
  hostname: string
  displayName?: string
  ip?: string
  macAddress?: string
  osUuid?: string
  agentVersion?: string
  status: string
  lastSeen?: string
  organization?: {
    id: string
    organizationId: string
    name: string
  }
  serialNumber?: string
  manufacturer?: string
  model?: string
  type?: string
  osType?: string
  osVersion?: string
  osBuild?: string
  timezone?: string
  registeredAt?: string
  updatedAt?: string
  tags?: Array<{
    id: string
    name: string
    description?: string
    color?: string
    organizationId: string
    createdAt: string
    createdBy: string
  }>
  toolConnections?: ToolConnection[]
}

export type DeviceGraphQLNode = {
  id: string
  machineId: string
  hostname: string
  displayName?: string
  ip?: string
  macAddress?: string
  osUuid?: string
  agentVersion?: string
  status: string
  lastSeen?: string
  organization?: {
    id: string
    organizationId: string
    name: string
  }
  serialNumber?: string
  manufacturer?: string
  model?: string
  type?: string
  osType?: string
  osVersion?: string
  osBuild?: string
  timezone?: string
  registeredAt?: string
  updatedAt?: string
  tags?: Array<{
    id: string
    name: string
    description?: string
    color?: string
    organizationId: string
    createdAt: string
    createdBy: string
  }>
  toolConnections?: ToolConnection[]
}
