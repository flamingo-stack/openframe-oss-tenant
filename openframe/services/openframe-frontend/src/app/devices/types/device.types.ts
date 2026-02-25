/**
 * Unified Device types - Single source of truth
 * All fields at root level, no nesting
 */

/**
 * Unified Software type
 */
export interface Software {
  id: number;
  name: string;
  version: string;
  source: 'apps' | 'chrome_extensions' | 'vscode_extensions' | 'homebrew_packages' | 'python_packages';
  vendor?: string;
  bundle_identifier?: string;
  vulnerabilities: Vulnerability[];
  installed_paths: string[];
  last_opened_at?: string;
}

/**
 * Unified Vulnerability type
 */
export interface Vulnerability {
  cve: string;
  details_link: string;
  created_at: string;
}

/**
 * Unified Battery type
 */
export interface Battery {
  cycle_count: number;
  health: string; // e.g., "Normal (99%)"
}

/**
 * Unified User type
 */
export interface User {
  username: string;
  uid?: number;
  type?: string;
  groupname?: string;
  shell?: string;
  isLoggedIn?: boolean;
}

/**
 * Unified MDM Info type
 */
export interface MdmInfo {
  enrollment_status: string;
  server_url: string;
  name: string;
  encryption_key_available: boolean;
  device_status: string;
  pending_action: string;
  connected_to_fleet: boolean;
}

/**
 * Device Tag type
 */
export interface DeviceTag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  organizationId: string;
  createdAt: string;
  createdBy: string;
}

/**
 * Tool Type enum
 */
export type ToolType = 'MESHCENTRAL' | 'TACTICAL_RMM' | 'FLEET_MDM';

/**
 * Tool Connection type
 */
export interface ToolConnection {
  id: string;
  machineId: string;
  toolType: ToolType;
  agentToolId: string;
  status: string;
  metadata?: any;
  connectedAt?: string;
  lastSyncAt?: string;
  disconnectedAt?: string;
}

/**
 * Installed Agent type
 */
export interface InstalledAgent {
  id: string;
  machineId: string;
  agentType: string;
  version?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * UNIFIED DEVICE TYPE
 * Single source of truth - all fields at root level, no nesting
 */
export interface Device {
  // Core Identifiers
  id: string;
  machineId: string;
  hostname: string;
  displayName: string;

  // Hardware - CPU
  cpu_brand?: string;
  cpu_type?: string;
  cpu_subtype?: string;
  cpu_physical_cores?: number;
  cpu_logical_cores?: number;

  // Hardware - Memory
  memory?: number; // bytes
  totalRam?: string; // formatted string (e.g., "16.00 GB")

  // Hardware - Identifiers
  hardware_serial?: string;
  hardware_vendor?: string;
  hardware_model?: string;
  hardware_version?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;

  // Storage
  gigs_disk_space_available?: number;
  percent_disk_space_available?: number;
  gigs_total_disk_space?: number;
  disk_encryption_enabled?: boolean;
  disks?: Array<{
    free: string;
    used: string;
    total: string;
    device: string;
    fstype: string;
    percent: number;
  }>;

  // Network
  primary_ip?: string;
  primary_mac?: string;
  public_ip?: string;
  local_ips: string[];
  ip?: string;
  macAddress?: string;

  // System Status
  status: string;
  uptime?: number; // seconds
  last_seen?: string;
  lastSeen?: string;
  last_restarted_at?: string;
  last_enrolled_at?: string;
  boot_time?: number;

  // Operating System
  platform?: string;
  platform_like?: string;
  os_version?: string;
  build?: string;
  code_name?: string;
  operating_system?: string;
  osType?: string;
  osVersion?: string;
  osBuild?: string;

  // Software & Versions
  osquery_version?: string;
  orbit_version?: string;
  fleet_desktop_version?: string;
  scripts_enabled?: boolean;
  agentVersion?: string;

  // Unified Arrays (NO NESTING)
  software?: Software[];
  batteries?: Battery[];
  users?: User[];

  // MDM Info
  mdm?: MdmInfo;

  // Organization
  organizationId?: string;
  organization?: string;
  organizationImageUrl?: string | null;

  // Tags
  tags?: DeviceTag[];

  // Tool Connections
  toolConnections?: ToolConnection[];

  // Installed Agents
  installedAgents?: InstalledAgent[];

  // Misc
  type?: string;
  registeredAt?: string;
  updatedAt?: string;
  osUuid?: string;

  // Reference IDs (NOT nested data)
  fleetId?: number;
  tacticalAgentId?: string;
  agent_id?: string; // Alias for tactical agent ID

  // Graphics
  graphics?: string;

  // Legacy fields for backward compatibility
  serialNumber?: string; // Alias for serial_number
  description?: string; // Device description
  plat?: string; // Platform (for scripts modal)
  logged_in_username?: string; // Currently logged in user
  logged_username?: string; // Alias for logged_in_username

  // Legacy Tactical RMM fields
  cpu_model?: string[]; // CPU model array (Tactical format)
  physical_disks?: string[]; // Physical disk info from Tactical
  total_ram?: string; // Total RAM (formatted string)
  make_model?: string; // Make and model combined
  site_name?: string; // Tactical site name
  client_name?: string; // Tactical client name
  monitoring_type?: string; // Monitoring type
  needs_reboot?: boolean; // Needs reboot flag
  pending_actions_count?: number; // Pending actions count
  overdue_text_alert?: boolean; // Overdue text alert
  overdue_email_alert?: boolean; // Overdue email alert
  overdue_dashboard_alert?: boolean; // Overdue dashboard alert
  checks?: {
    // Health checks
    total: number;
    passing: number;
    failing: number;
    warning: number;
    info: number;
    has_failing_checks: boolean;
  };
  maintenance_mode?: boolean; // Maintenance mode flag
  italic?: boolean; // Italic display flag
  block_policy_inheritance?: boolean; // Block policy inheritance
  goarch?: string; // Go architecture
  has_patches_pending?: boolean; // Has patches pending
  custom_fields?: any[]; // Custom fields array
  version?: string; // Agent version (alias)
}

// Additional types for device filtering
export interface DeviceFilterValue {
  value: string;
  count: number;
}

export interface DeviceFilterTag {
  value: string;
  label: string;
  count: number;
}

export interface DeviceFilters {
  statuses: DeviceFilterValue[];
  deviceTypes: DeviceFilterValue[];
  osTypes: DeviceFilterValue[];
  organizationIds: DeviceFilterValue[];
  tags: DeviceFilterTag[];
  filteredCount: number;
}

export interface DeviceFilterInput {
  statuses?: string[];
  deviceTypes?: string[];
  osTypes?: string[];
  organizationIds?: string[];
  tags?: string[];
}

export interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

export type DevicesGraphQlNode = {
  id: string;
  machineId?: string;
  hostname: string;
  displayName?: string;
  ip?: string;
  macAddress?: string;
  osUuid?: string;
  agentVersion?: string;
  status: string;
  lastSeen?: string;
  organization?: {
    id: string;
    organizationId: string;
    name: string;
    image?: {
      imageUrl: string;
    };
  };
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  type?: string;
  osType?: string;
  osVersion?: string;
  osBuild?: string;
  timezone?: string;
  registeredAt?: string;
  updatedAt?: string;
  tags?: Array<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    organizationId: string;
    createdAt: string;
    createdBy: string;
  }>;
  toolConnections?: ToolConnection[];
  installedAgents?: InstalledAgent[];
};

export type DeviceGraphQlNode = {
  id: string;
  machineId: string;
  hostname: string;
  displayName?: string;
  ip?: string;
  macAddress?: string;
  osUuid?: string;
  agentVersion?: string;
  status: string;
  lastSeen?: string;
  organization?: {
    id: string;
    organizationId: string;
    name: string;
    image?: {
      imageUrl: string;
    };
  };
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  type?: string;
  osType?: string;
  osVersion?: string;
  osBuild?: string;
  timezone?: string;
  registeredAt?: string;
  updatedAt?: string;
  tags?: Array<{
    id: string;
    name: string;
    description?: string;
    color?: string;
    organizationId: string;
    createdAt: string;
    createdBy: string;
  }>;
  toolConnections?: ToolConnection[];
  installedAgents?: InstalledAgent[];
};
