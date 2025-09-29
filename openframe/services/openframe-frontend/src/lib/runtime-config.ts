import { env } from 'next-runtime-env'

export const runtimeEnv = {
  tenantHostUrl(): string {
    return env('NEXT_PUBLIC_TENANT_HOST_URL') || ''
  },
  sharedHostUrl(): string {
    return env('NEXT_PUBLIC_SHARED_HOST_URL') || ''
  },
  appMode(): string {
    // Supported modes: 'oss-tenant' | 'saas-tenant' | 'saas-shared'
    return env('NEXT_PUBLIC_APP_MODE') || 'oss-tenant'
  },
  appType(): string {
    return env('NEXT_PUBLIC_APP_TYPE') || 'openframe-dashboard'
  },
  appUrl(): string {
    return env('NEXT_PUBLIC_APP_URL') || 'https://openframe.dev'
  },
  devUrl(): string {
    return env('NEXT_PUBLIC_DEV_URL') || 'http://localhost:4000'
  },
  enableDevTicketObserver(): boolean {
    return (env('NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER') || 'false') === 'true'
  },
  authCheckIntervalMs(): number {
    const raw = env('NEXT_PUBLIC_AUTH_CHECK_INTERVAL') || '300000'
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 300000
  },
  authLoginUrl(): string {
    return env('NEXT_PUBLIC_AUTH_LOGIN_URL') || ''
  },
}
