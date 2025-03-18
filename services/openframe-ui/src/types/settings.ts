export interface BaseSettings {
  id: number;
  created_by: string;
  created_time: string;
  modified_by: string;
  modified_time: string;
}

export interface RMMSettings extends BaseSettings {
  agent_port?: number;
  check_interval?: number;
  agent_debug_level: string;
  debug_log_prune_days: number;
  agent_history_prune_days: number;
  check_history_prune_days: number;
  resolved_alerts_prune_days: number;
  audit_log_prune_days: number;
  clear_faults_days: number;
  agent_auto_update: boolean;
  smtp_from_email: string;
  smtp_from_name: string | null;
  smtp_host: string;
  smtp_host_user: string;
  smtp_host_password: string;
  smtp_port: number;
  smtp_requires_auth: boolean;
  email_alert_recipients: string[];
  sms_alert_recipients: string[];
  twilio_number: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  notify_on_warning_alerts: boolean;
  notify_on_info_alerts: boolean;
  default_time_zone: string;
  all_timezones: string[];
  date_format: string;
  enable_server_scripts: boolean;
  enable_server_webterminal: boolean;
  mesh_token: string;
  mesh_username: string;
  mesh_site: string;
  mesh_device_group: string;
  mesh_company_name: string | null;
  sync_mesh_with_trmm: boolean;
  open_ai_token: string | null;
  open_ai_model: string;
  block_local_user_logon: boolean;
  sso_enabled: boolean;
  workstation_policy: string | null;
  server_policy: string | null;
  alert_template: string | null;
  org_info: {
    org_name: string;
    org_logo_url: string | null;
    org_logo_url_dark: string | null;
    org_logo_url_light: string | null;
  };
}

export interface MDMSettings extends BaseSettings {
  // Add MDM specific settings here
}

export interface ApiKey {
  id: number;
  name: string;
  key: string;
  expiration: string | null;
  created_by: string | null;
  created_time: string;
  modified_by: string | null;
  modified_time: string;
  user: number;
}

export interface UrlAction {
  id: number;
  name: string;
  desc: string;
  pattern: string;
  action_type: 'rest' | 'web';
  rest_method: string;
  rest_body: string;
  rest_headers: string;
  created_by: string;
  created_time: string;
  modified_by: string;
  modified_time: string;
}

export interface KeyStore {
  id: number;
  name: string;
  value: string;
  created_time: string;
  modified_time: string;
}

export interface CustomField {
  id: number;
  name: string;
  model: string;
  type: string;
  required: boolean;
  options: string[];
  created_by: string;
  created_time: string;
  modified_by: string;
  modified_time: string;
  order: number;
  default_value_string: string;
  default_value_bool: boolean;
  default_values_multiple: string[];
  hide_in_ui: boolean;
  hide_in_summary: boolean;
}

export interface DynamicSettings<T extends BaseSettings> extends T {
  [key: string]: any;
  api_keys?: ApiKey[];
  url_actions?: UrlAction[];
  webhooks?: UrlAction[];
} 