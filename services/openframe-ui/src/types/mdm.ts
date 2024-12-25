export interface UpdatePolicy {
  minimum_version: string | null
  deadline: string | null
}

export interface WindowsUpdatePolicy {
  deadline_days: number | null
  grace_period_days: number | null
}

export interface MDMConfig {
  enabled_and_configured: boolean
  apple_bm_enabled_and_configured: boolean
  windows_enabled_and_configured: boolean
  macos_updates: UpdatePolicy | null
  ios_updates: UpdatePolicy | null
  ipados_updates: UpdatePolicy | null
  windows_updates: WindowsUpdatePolicy | null
  apple_server_url: string
  macos_settings: {
    custom_settings: any | null
  } | null
  windows_settings: {
    custom_settings: any | null
  } | null
  enable_disk_encryption: boolean
} 