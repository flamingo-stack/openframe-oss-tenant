declare global {
  interface Window {
    __RUNTIME_CONFIG__?: Record<string, string | undefined>
  }
}

function readFromWindow(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.__RUNTIME_CONFIG__?.[key]
}

function readFromProcess(key: string): string | undefined {
  // Fallback to process.env for development or SSR contexts
  // Note: For client bundles, Next may inline these during build
  // but runtime-config takes precedence when present
  // eslint-disable-next-line no-process-env
  return (process as any)?.env?.[key]
}

export function getRuntimeEnv(key: string, fallback?: string): string {
  const win = readFromWindow(key)
  if (win !== undefined && win !== '') return String(win)
  const proc = readFromProcess(key)
  if (proc !== undefined && proc !== '') return String(proc)
  return fallback ?? ''
}

export const runtimeEnv = {
  apiUrl(): string {
    return getRuntimeEnv('NEXT_PUBLIC_API_URL')
  },
  appMode(): string {
    return getRuntimeEnv('NEXT_PUBLIC_APP_MODE', 'full-app')
  },
  appType(): string {
    return getRuntimeEnv('NEXT_PUBLIC_APP_TYPE', 'openframe-dashboard')
  },
  appUrl(): string {
    return getRuntimeEnv('NEXT_PUBLIC_APP_URL', 'https://openframe.dev')
  },
  devUrl(): string {
    return getRuntimeEnv('NEXT_PUBLIC_DEV_URL')
  },
  enableDevTicketObserver(): boolean {
    return getRuntimeEnv('NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER', 'false') === 'true'
  },
  authCheckIntervalMs(): number {
    const raw = getRuntimeEnv('NEXT_PUBLIC_AUTH_CHECK_INTERVAL', '300000')
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 300000
  },
}


