// OpenFrame Authentication Types
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  tenantId: string
  tenantName: string
  tenantDomain: string
  role?: string
}

export interface LoginRequest {
  email: string
  password?: string
}

export interface RegisterRequest {
  tenantName: string
  tenantDomain: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface TenantInfo {
  tenantId: string
  tenantName: string
  tenantDomain: string
  authProviders: string[]
}

export interface TenantDiscoveryResponse {
  has_existing_accounts: boolean
  tenant_id?: string
  tenant_name?: string
  tenant_domain?: string
  auth_providers?: string[]
}

export interface SSOProvider {
  provider: string
  enabled: boolean
  displayName: string
}

export type AuthStep = 
  | 'choice'           // Choose between login or signup
  | 'signup'           // Signup form with org details
  | 'login-email'      // Enter email for login
  | 'login-providers'  // Show SSO providers based on email

export interface AuthState {
  step: AuthStep
  email: string
  tenantInfo: TenantInfo | null
  discoveredTenants: TenantInfo[]
  isLoading: boolean
  error: string | null
}