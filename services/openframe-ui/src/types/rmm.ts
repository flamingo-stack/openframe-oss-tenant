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