import type { ApiKey, UrlAction, KeyStore, CustomField } from './settings';

export interface RMMSettings {
  id?: number;
  created_by?: string;
  created_time?: string;
  modified_by?: string;
  modified_time?: string;
  default_time_zone: string;
  agent_debug_level: string;
  agent_auto_update: boolean;
  check_history_prune_days: number;
  resolved_alerts_prune_days: number;
  agent_history_prune_days: number;
  debug_log_prune_days: number;
  audit_log_prune_days: number;
  clear_faults_days: number;
  notify_on_warning_alerts: boolean;
  notify_on_info_alerts: boolean;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_host: string;
  smtp_port: number;
  smtp_requires_auth: boolean;
  smtp_host_user: string;
  smtp_host_password: string;
  email_alert_recipients: string[];
  twilio_number: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_to_number: string;
  twilio_alert_recipients: string[];
  all_timezones: string[];
  org_info?: {
    org_name: string;
    org_logo_url: string | null;
    org_logo_url_dark: string | null;
    org_logo_url_light: string | null;
  };
  api_keys?: ApiKey[];
  url_actions?: UrlAction[];
  webhooks?: UrlAction[];
  key_store?: KeyStore[];
  custom_fields?: CustomField[];
  sms_alert_recipients?: string[];
  date_format?: string;
  enable_server_scripts?: boolean;
  enable_server_webterminal?: boolean;
  mesh_token?: string;
  mesh_username?: string;
  mesh_site?: string;
  mesh_device_group?: string;
  mesh_company_name?: string;
  sync_mesh_with_trmm?: boolean;
  open_ai_token?: string;
  open_ai_model?: string;
  block_local_user_logon?: boolean;
  mesh_debug_level?: string;
  mesh_company_id?: string;
  mesh_two_factor?: boolean;
  mesh_config_backup?: boolean;
  mesh_config_restore?: boolean;
  mesh_config_archive?: boolean;
  mesh_config_archive_days?: number;
  sso_enabled?: boolean;
  workstation_policy?: string;
  server_policy?: string;
  alert_template?: string;
  agent_auto_update_enabled?: boolean;
  agent_auto_update_policy?: string;
  agent_auto_update_schedule?: string;
  agent_auto_update_grace_period?: number;
}

export type ExtendedRMMSettings = RMMSettings & {
  [key: string]: unknown;
}

export interface WmiDetail {
  cpus: string[];
  gpus: string[];
  disks: string[];
  local_ips: string[];
  make_model: string;
  serialnumber: string;
}

export interface Disk {
  free: string;
  used: string;
  total: string;
  device: string;
  fstype: string;
  percent: number;
}

export interface Device {
  agent_id: string;
  hostname: string;
  plat: string;
  operating_system: string;
  status: string;
  last_seen: string;
  public_ip: string;
  local_ips: string;
  cpu_model: string[];
  total_ram: number;
  logged_in_username: string;
  timezone: string;
  make_model: string;
  wmi_detail: WmiDetail;
  disks: Disk[];
  physical_disks: string[];
  storage: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  ram: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  swap: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  private_ips: string[];
  public_ips: string[];
  antivirus: {
    name: string;
    status: string;
  };
  firewall: {
    enabled: boolean;
    status: string;
  };
  antivirus_status: string;
  firewall_status: string;
  antivirus_enabled: boolean;
  firewall_enabled: boolean;
  antivirus_name: string;
  firewall_name: string;
  antivirus_definitions: string;
  antivirus_scan_time: string;
  antivirus_scan_status: string;
  antivirus_scan_progress: number;
  antivirus_scan_last_run: string;
  antivirus_scan_next_run: string;
  antivirus_scan_scheduled: boolean;
  antivirus_scan_schedule: string;
  antivirus_scan_type: string;
  antivirus_scan_target: string;
  antivirus_scan_exclusions: string[];
  antivirus_scan_history: {
    timestamp: string;
    status: string;
    type: string;
    target: string;
    results: string;
  }[];
  firewall_rules: {
    name: string;
    enabled: boolean;
    direction: string;
    action: string;
    protocol: string;
    local_port: string;
    remote_port: string;
    local_ip: string;
    remote_ip: string;
    profile: string;
  }[];
  firewall_profiles: {
    name: string;
    enabled: boolean;
    inbound_rules: string[];
    outbound_rules: string[];
  }[];
  firewall_logs: {
    timestamp: string;
    action: string;
    direction: string;
    protocol: string;
    local_port: string;
    remote_port: string;
    local_ip: string;
    remote_ip: string;
    profile: string;
  }[];
}

// Base API response interface
export interface ApiResponse<T> {
  data: T;
}

// Command response using the base interface
export interface CommandResponse extends ApiResponse<{
  output: string;
}> {}

// Alert response using the base interface
export interface AlertResponse extends ApiResponse<{
  alerts_count: number;
  alerts: Alert[];
}> {}

// Device response using the base interface
export interface DeviceResponse extends ApiResponse<Device[]> {}

// Check response using the base interface
export interface CheckResponse extends ApiResponse<Check[]> {}

// Task response using the base interface
export interface TaskResponse extends ApiResponse<Task[]> {}

export interface Alert {
  id?: number;
  timestamp?: string;
  created?: string;
  alert_time?: string;
  alert_type?: string;
  severity: string;
  message: string | null;
  snoozed?: boolean;
  resolved?: boolean;
}

export interface Check {
  id: string;
  status: string;
}

export interface Task {
  id: string;
  status: string;
  completed: boolean;
} 

// History related interfaces
export interface ScriptResult {
  id: number;
  stderr: string;
  stdout: string;
  retcode: number;
  execution_time: number;
}

export interface HistoryEntry {
  id: number;
  time: string;
  type: string;
  command: string;
  username: string;
  results: string | null;
  script_results: ScriptResult | null;
  collector_all_output: boolean;
  save_to_agent_note: boolean;
  agent: number;
  script: number | null;
  script_name?: string;
  custom_field: any | null;
  agent_info?: any; // Add agent_info field to store API data
}  