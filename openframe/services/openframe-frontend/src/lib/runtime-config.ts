import { env } from 'next-runtime-env'

export const runtimeEnv = {
  apiUrl(): string {
    return env('NEXT_PUBLIC_API_URL') || 'http://localhost/api'
  },
  appMode(): string {
    return env('NEXT_PUBLIC_APP_MODE') || 'full-app'
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
}
