/**
 * Fleet MDM API Response Types
 * Complete type definitions for Fleet MDM host data
 */

export interface FleetVulnerability {
  cve: string;
  details_link: string;
  created_at: string;
  // Fleet Premium severity fields — present only on Premium instances; optional everywhere.
  cvss_score?: number | null;
  epss_probability?: number | null;
  cisa_known_exploit?: boolean | null;
  cve_published?: string | null;
  resolved_in_version?: string | null;
}

/** Fleet built-in GeoIP for the host's public IP (present when Fleet has the GeoIP db loaded). */
export interface FleetGeolocation {
  country_iso?: string;
  city_name?: string;
  geometry?: { type?: string; coordinates?: number[] };
}

/** Per-host end-user identity (emails/IdP) from Fleet `end_users` — e.g. Chrome-profile emails. */
export interface FleetEndUser {
  username?: string;
  full_name?: string;
  email?: string;
  idp_info_updated_at?: string | null;
  other_emails?: Array<{ email: string; source?: string }>;
  groups?: string[];
}

/** Per-host policy as returned in `GET /hosts/:id` → `host.policies`. */
export interface FleetHostPolicy {
  id: number;
  name: string;
  query?: string;
  description?: string;
  resolution?: string;
  platform?: string;
  critical: boolean;
  /** Pass/fail outcome for THIS host; empty string when not yet evaluated. */
  response: 'pass' | 'fail' | '';
}

export interface FleetSignatureInfo {
  installed_path: string;
  team_identifier: string;
}

export interface FleetSoftware {
  id: number;
  name: string;
  version: string;
  source: 'apps' | 'chrome_extensions' | 'vscode_extensions' | 'homebrew_packages' | 'python_packages';
  extension_id?: string;
  browser?: string;
  vendor?: string;
  bundle_identifier?: string;
  generated_cpe?: string;
  vulnerabilities: FleetVulnerability[] | null;
  installed_paths: string[];
  signature_information: FleetSignatureInfo[];
  last_opened_at?: string;
}

export interface FleetUser {
  uid: number;
  username: string;
  type: string;
  groupname: string;
  shell: string;
}

export interface FleetBattery {
  cycle_count: number;
  health: string;
}

export interface FleetLabel {
  id: number;
  name: string;
  description: string;
  query: string;
  platform: string;
  label_type: string;
  label_membership_type: string;
  created_at: string;
  updated_at: string;
}

export interface FleetMdmInfo {
  enrollment_status: string;
  dep_profile_error: boolean;
  server_url: string;
  name: string;
  encryption_key_available: boolean;
  profiles: any[] | null;
  device_status: string;
  pending_action: string;
  connected_to_fleet: boolean;
}

export interface FleetIssues {
  failing_policies_count: number;
  total_issues_count: number;
}

export interface FleetHost {
  // Core identification
  id: number;
  uuid: string;
  hostname: string;
  computer_name: string;
  hardware_serial: string;

  // Platform & OS
  platform: string;
  platform_like: string;
  os_version: string;
  build: string;
  code_name: string;

  // Hardware - CPU
  cpu_type: string;
  cpu_subtype: string;
  cpu_brand: string;
  cpu_physical_cores: number;
  cpu_logical_cores: number;

  // Hardware - General
  hardware_vendor: string;
  hardware_model: string;
  hardware_version: string;
  memory: number;

  // Network
  public_ip: string;
  primary_ip: string;
  primary_mac: string;

  // Storage
  gigs_disk_space_available: number;
  percent_disk_space_available: number;
  gigs_total_disk_space: number;
  disk_encryption_enabled: boolean;

  // System status
  uptime: number;
  status: 'online' | 'offline' | 'mia';
  seen_time: string;
  last_enrolled_at: string;
  last_restarted_at: string;

  // Software & Versions
  osquery_version: string;
  orbit_version: string;
  fleet_desktop_version: string;
  scripts_enabled: boolean;
  software?: FleetSoftware[];
  software_updated_at: string;

  // Configuration
  distributed_interval: number;
  config_tls_refresh: number;
  logger_tls_period: number;

  // Team & Organization
  team_id: number | null;
  team_name: string | null;

  // Users & Access
  users: FleetUser[];

  // Batteries
  batteries: FleetBattery[];

  // MDM
  mdm: FleetMdmInfo;

  // Policies & Labels
  policies: FleetHostPolicy[];
  labels: FleetLabel[];
  packs: any[];
  pack_stats: any[] | null;

  // Issues
  issues: FleetIssues;

  // Timestamps
  detail_updated_at: string;
  label_updated_at: string;
  policy_updated_at: string;

  // Geolocation (Fleet built-in GeoIP)
  geolocation?: FleetGeolocation;

  // End-user identity (emails / IdP)
  end_users?: FleetEndUser[];

  // Misc
  refetch_requested: boolean;
  refetch_critical_queries_until: string | null;
  display_text: string;
  display_name: string;
}

export interface FleetHostResponse {
  host: FleetHost;
}
