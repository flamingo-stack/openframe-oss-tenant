import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core';
import { OS_PLATFORMS } from '@flamingo-stack/openframe-frontend-core';

const HIDDEN_PLATFORMS: OSPlatformId[] = ['linux'];

export const DISABLED_PLATFORMS: OSPlatformId[] = ['darwin'];

export const AVAILABLE_PLATFORMS = OS_PLATFORMS.filter(p => !HIDDEN_PLATFORMS.includes(p.id));

/**
 * Map supported_platforms from script to osTypes filter values
 * Script uses: 'windows', 'linux', 'darwin'
 * Device filter expects: 'WINDOWS', 'MAC_OS'
 */
export function mapPlatformsToOsTypes(platforms: string[]): string[] {
  const mapping: Record<string, string> = {
    windows: 'WINDOWS',
    darwin: 'MAC_OS',
  };

  return platforms.map(p => mapping[p.toLowerCase()]).filter((v): v is string => !!v);
}

export function mapPlatformsForDisplay(platforms: string[]): string[] {
  const mapping: Record<string, string> = {
    windows: 'Windows',
    darwin: 'macOS',
    linux: 'Linux',
  };

  return platforms.map(p => mapping[p.toLowerCase()]).filter((v): v is string => !!v);
}
