import type { Device } from '../../devices/types/device.types'
import { normalizeDevicePlatform } from '../../devices/utils/device-command-utils'

/**
 * Get the primary identifier for a device.
 * Prefers machineId, falls back to agent_id, then id.
 */
export function getDevicePrimaryId(device: Device): string {
  return device.machineId || device.agent_id || device.id
}

/**
 * Normalize OS string to platform ID, returning null for unrecognized values.
 * Unlike normalizeDevicePlatform which defaults to 'darwin', this returns null
 * so callers can detect mixed/unknown platforms.
 */
export function normalizeOsOrNull(os?: string): 'windows' | 'linux' | 'darwin' | null {
  if (!os) return null
  const lower = os.toLowerCase()
  if (
    !lower.includes('win') &&
    !lower.includes('darwin') && !lower.includes('mac') && !lower.includes('osx') &&
    !lower.includes('linux') && !lower.includes('ubuntu') && !lower.includes('debian') &&
    !lower.includes('centos') && !lower.includes('redhat') && !lower.includes('fedora')
  ) {
    return null
  }
  return normalizeDevicePlatform(undefined, os)
}

/**
 * Determine the OS type from a set of selected devices.
 * Returns the single platform if all devices share the same OS, or 'all' if mixed.
 */
export function resolveOsTypeFromDevices(
  devices: Device[]
): 'windows' | 'linux' | 'darwin' | 'all' {
  const osTypesSet = new Set(
    devices
      .map(d => normalizeOsOrNull(d.osType || d.operating_system))
      .filter((v): v is 'windows' | 'linux' | 'darwin' => v !== null)
  )
  return osTypesSet.size === 1 ? Array.from(osTypesSet)[0] : 'all'
}

/**
 * Determine the shell to use based on the resolved OS type and script shell preference.
 */
export function resolveShellForExecution(
  resolvedOsType: string,
  scriptShell?: string
): string {
  if (resolvedOsType === 'windows') {
    return scriptShell === 'powershell' ? 'powershell' : 'cmd'
  }
  return '/bin/bash'
}
