import { env } from 'next-runtime-env'

function getEnvVar(key: string): string | undefined {
  try {
    const value = env(key)
    if (value === undefined || value === null || value === '') {
      return undefined
    }
    return value
  } catch {
    if (typeof window !== 'undefined' && (window as any).process?.env) {
      return (window as any).process.env[key]
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key]
    }
    return undefined
  }
}

export const runtimeEnv = {
  tenantHostUrl(): string {
    return getEnvVar('NEXT_PUBLIC_TENANT_HOST_URL') || ''
  },
  sharedHostUrl(): string {
    return getEnvVar('NEXT_PUBLIC_SHARED_HOST_URL') || ''
  },
  gtmContainerId(): string | undefined {
    return getEnvVar('NEXT_PUBLIC_GTM_CONTAINER_ID')
  },
  appMode(): string {
    const mode = getEnvVar('NEXT_PUBLIC_APP_MODE')
    return mode || 'oss-tenant'
  },
  appType(): string {
    return getEnvVar('NEXT_PUBLIC_APP_TYPE') || 'openframe-dashboard'
  },
  appUrl(): string {
    return getEnvVar('NEXT_PUBLIC_APP_URL') || 'https://openframe.dev'
  },
  devUrl(): string {
    return getEnvVar('NEXT_PUBLIC_DEV_URL') || 'http://localhost:4000'
  },
  enableDevTicketObserver(): boolean {
    return (getEnvVar('NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER') || 'false') === 'true'
  },
  authCheckIntervalMs(): number {
    const raw = getEnvVar('NEXT_PUBLIC_AUTH_CHECK_INTERVAL') || '300000'
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 300000
  },
  authLoginUrl(): string {
    return getEnvVar('NEXT_PUBLIC_SHARED_HOST_URL') || ''
  },
  featureOrganizationImages(): boolean {
    return (getEnvVar('NEXT_PUBLIC_FEATURE_ORG_IMAGES') || 'true') === 'true'
  },
  featureSSOAllowDomain(): boolean {
    return (getEnvVar('NEXT_PUBLIC_ENABLE_SSO_DOMAIN_ALLOWLIST') || 'true') === 'true'
  },
  featureScriptSchedule(): boolean {
    return (getEnvVar('NEXT_PUBLIC_FEATURE_SCRIPT_SCHEDULE') || 'false') === 'true'
  },
  featureMonitoring(): boolean {
    return (getEnvVar('NEXT_PUBLIC_FEATURE_MONITORING') || 'false') === 'true'
  },
}
