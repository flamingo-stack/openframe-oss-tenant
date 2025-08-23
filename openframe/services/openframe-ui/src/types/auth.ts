// Authentication and authorization related types

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  tenantName?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  tenant_id?: string;
  tenant_domain?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  tenantId: string;
  tenantDomain: string;
  authenticated: boolean;
}

// Tenant Discovery Types
export interface TenantDiscoveryResponse {
  email: string;
  has_existing_accounts: boolean;
  tenants: TenantInfo[];
}

export interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
  tenant_domain: string;
  openframe_url: string;
  auth_providers: string[]; // ["password", "google", "openframe_sso"]
  user_exists: boolean;
}

export interface TenantAvailabilityResponse {
  tenant_name: string;
  is_available: boolean;
  suggested_url?: string;
  message: string;
}

// OAuth Error Types
export type OAuthErrorType =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'invalid_token'
  | 'server_error'
  | 'temporarily_unavailable';

export interface ErrorResponse {
  error: OAuthErrorType;
  error_description: string;
  state?: string;
}