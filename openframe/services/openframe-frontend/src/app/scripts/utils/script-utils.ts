/**
 * Map supported_platforms from script to osTypes filter values
 * Script uses: 'windows', 'linux', 'darwin'
 * Device filter expects: 'WINDOWS', 'MAC_OS'
 */
export function mapPlatformsToOsTypes(platforms: string[]): string[] {
  const mapping: Record<string, string> = {
    windows: 'WINDOWS',
    darwin: 'MAC_OS'
  }

  return platforms
    .map(p => mapping[p.toLowerCase()])
    .filter((v): v is string => !!v)
}

export function mapPlatformsForDisplay(platforms: string[]): string[] {
  const mapping: Record<string, string> = {
    windows: 'Windows',
    darwin: 'macOS',
    linux: 'Linux'
  }

  return platforms
    .map(p => mapping[p.toLowerCase()])
    .filter((v): v is string => !!v)
}