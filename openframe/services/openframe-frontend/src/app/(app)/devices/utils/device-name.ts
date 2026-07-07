/**
 * Single source of truth for a device's display name.
 *
 * The name comes from GraphQL only: `displayName` when present, otherwise
 * `hostname`. No other fallbacks (description, machineId, deviceId, Fleet
 * display_name, …) — those diverge across screens and must not be used.
 */
export function getDeviceName(device?: { displayName?: string | null; hostname?: string | null } | null): string {
  return device?.displayName || device?.hostname || '';
}
