import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { OS_PLATFORMS } from '@flamingo-stack/openframe-frontend-core/utils';

/** Platforms completely hidden from the UI */
const HIDDEN_PLATFORMS: OSPlatformId[] = ['linux'];

/** Platforms visible but not selectable (shown with "Coming Soon" badge) */
export const DISABLED_PLATFORMS: OSPlatformId[] = [];

/** Platforms visible in the UI (excludes hidden ones) */
export const AVAILABLE_PLATFORMS = OS_PLATFORMS.filter(p => !HIDDEN_PLATFORMS.includes(p.id));
