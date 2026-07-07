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
  /** From Fleet `signature_information` — true when the binary carries a code-signing identity. */
  signed?: boolean;
  /** First non-empty `team_identifier` from Fleet `signature_information`. */
  signature_team_id?: string;
  generated_cpe?: string;
  browser?: string;
  extension_id?: string;
}

/**
 * Unified Vulnerability type
 */
export interface Vulnerability {
  cve: string;
  details_link: string;
  created_at: string;
  // Fleet Premium severity fields — optional (present only on Premium instances).
  cvss_score?: number | null;
  epss_probability?: number | null;
  cisa_known_exploit?: boolean | null;
  cve_published?: string | null;
  resolved_in_version?: string | null;
}

/** A compliance policy evaluated against this specific device (from Fleet MDM). */
export interface DevicePolicy {
  id: number;
  name: string;
  description?: string;
  critical: boolean;
  /** Comma-separated OS platforms the policy targets (e.g. "darwin,windows"). */
  platform?: string;
  /** Pass/fail outcome for this device; empty string when not yet evaluated. */
  response: 'pass' | 'fail' | '';
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
  /** Fleet `mdm.dep_profile_error` — DEP enrollment profile assignment failed. */
  dep_profile_error?: boolean;
  /** Count of configuration profiles from Fleet `mdm.profiles`. */
  profiles_count?: number;
}

/** Host geolocation derived from Fleet's built-in GeoIP (`geolocation`). */
export interface DeviceGeolocation {
  city?: string;
  country?: string;
}

/**
 * Device Tag type
 */
export interface DeviceTag {
  tagId: string;
  key: string;
  description?: string;
  color?: string;
  values: string[];
  createdAt?: string;
}

/**
 * Tool Type enum
 */
export type ToolType = 'MESHCENTRAL' | 'FLEET_MDM';

/**
 * Tool Connection type
 */
export interface ToolConnection {
  id: string;
  machineId: string;
  toolType: ToolType;
  agentToolId: string;
  status: string;
  /** ISO date string: Fleet seen_time / MeshCentral last connection — shown under status */
  lastSeen?: string;
  /** Fleet detail_updated_at — when host details were last fetched */
  lastFetched?: string;
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
  policies?: DevicePolicy[];

  // MDM Info
  mdm?: MdmInfo;

  // Organization
  organizationId?: string;
  organization?: string;
  organizationImageUrl?: string | null;
  organizationImageHash?: string | null;

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
  timezone?: string;

  // Fleet-derived metadata
  software_updated_at?: string; // Fleet software inventory last-scanned timestamp
  fleetTeamName?: string;
  fleetTeamId?: number | null;
  fleetLabels?: string[];
  failingPoliciesCount?: number;
  totalIssuesCount?: number;
  geolocation?: DeviceGeolocation;
  /** End-user emails from Fleet `end_users` (Chrome profiles / IdP). */
  endUserEmails?: string[];

  // Reference IDs (NOT nested data)
  fleetId?: number;
  agent_id?: string; // Alias for device/agent id

  // Legacy fields for backward compatibility
  serialNumber?: string; // Alias for serial_number
  description?: string; // Device description
  plat?: string; // Platform (for scripts modal)
  logged_in_username?: string; // Currently logged in user
  logged_username?: string; // Alias for logged_in_username
  make_model?: string; // Make and model combined
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

export interface TagFilterOption {
  key: string;
  value: string;
  count: number;
}

export interface DeviceFilters {
  statuses: DeviceFilterValue[];
  deviceTypes: DeviceFilterValue[];
  osTypes: DeviceFilterValue[];
  organizationIds: DeviceFilterTag[];
  tagKeys: TagFilterOption[];
  filteredCount: number;
}

export interface DeviceFilterInput {
  statuses?: string[];
  deviceTypes?: string[];
  osTypes?: string[];
  organizationIds?: string[];
  tagKeys?: string[];
  tagValues?: string[];
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
      hash?: string;
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
    tagId: string;
    key: string;
    description?: string;
    color?: string;
    values: string[];
    createdAt?: string;
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
      hash?: string;
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
    tagId: string;
    key: string;
    description?: string;
    color?: string;
    values: string[];
    createdAt?: string;
  }>;
  toolConnections?: ToolConnection[];
  installedAgents?: InstalledAgent[];
};
