import { runtimeEnv } from '../runtime-config'

export type MeshUrlParts = {
  baseHostPort: string
  scheme: 'ws' | 'wss'
}

export function getMeshBaseHostPort(): string {
  // Use tenant host for application websocket endpoints when provided
  const tenantHost = runtimeEnv.tenantHostUrl() || ''
  const env = `${tenantHost}/ws/tools/meshcentral-server`

  // Strip protocols if provided
  if (env.startsWith('ws://')) return env.substring('ws://'.length)
  if (env.startsWith('wss://')) return env.substring('wss://'.length)
  if (env.startsWith('http://')) return env.substring('http://'.length)
  if (env.startsWith('https://')) return env.substring('https://'.length)
  return env
}

export function getMeshWsScheme(): 'ws' | 'wss' {
  if (typeof window !== 'undefined') {
    return window.location.protocol === 'https:' ? 'wss' : 'ws'
  }
  // Default to ws for server-side or unknown
  return 'ws'
}

export function buildWsUrl(path: string): string {
  const base = getMeshBaseHostPort()
  const scheme = getMeshWsScheme()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${scheme}://${base}${normalizedPath}`
}

export const MESH_USER = process.env.NEXT_PUBLIC_MESH_USER || 'mesh@openframe.io'
export const MESH_PASS = process.env.NEXT_PUBLIC_MESH_PASS || 'meshpass@1234'
