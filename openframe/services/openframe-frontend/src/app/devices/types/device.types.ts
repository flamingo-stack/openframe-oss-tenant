/**
 * Shared Device types for the devices module
 */

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
  local_ips: string
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
