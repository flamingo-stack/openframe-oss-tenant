import { featureFlags } from '@/lib/feature-flags';

export type DialogVersion = 'v1' | 'v2';

export function useDialogVersion(): DialogVersion {
  return featureFlags.tickets.enabled() ? 'v2' : 'v1';
}
