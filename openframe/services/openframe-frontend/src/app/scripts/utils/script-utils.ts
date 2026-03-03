import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core';
import { OS_PLATFORMS } from '@flamingo-stack/openframe-frontend-core';

// Hidden platforms that won't show at all in the UI (not selectable, not visible) - currently only Linux due to pending support, but structure in place for future additions
const HIDDEN_PLATFORMS: OSPlatformId[] = ['linux'];

// Disabled platforms that shows but with badge "Coming Soon" (not selectable) - currently none, but structure in place for future additions
export const DISABLED_PLATFORMS: OSPlatformId[] = [];

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
