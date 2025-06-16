export interface SSOConfigRequest {
  clientId: string;
  clientSecret: string;
}

export interface SSOConfigResponse {
  id: string | null;
  provider: string;
  clientId: string | null;
  clientSecret: string | null;
  enabled: boolean;
}

export interface SSOConfigStatus {
  configured: boolean;
  enabled: boolean;
  provider: string;
  clientId: string | null;
}

export interface SSOValidationErrors {
  clientId?: string;
  clientSecret?: string;
}

export type SSOProvider = 'google' | 'microsoft' | 'github'; 