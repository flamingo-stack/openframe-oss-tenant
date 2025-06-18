export interface SSOConfigRequest {
  clientId: string;
  clientSecret: string;
}

export interface SSOConfigResponse {
  id?: string;
  provider: string;
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;
}

export interface SSOConfigStatus {
  enabled: boolean;
  provider: string;
  clientId?: string;
}

export interface SSOProviderInfo {
  provider: string;
  displayName: string;
}

export interface SSOValidationErrors {
  clientId?: string;
  clientSecret?: string;
}

export type SSOProvider = 'google' | 'microsoft' | 'slack'; 