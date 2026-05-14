import { useFeatureFlagsStore } from '@/stores/feature-flags-store';
import { runtimeEnv } from './runtime-config';

/**
 * Server-known flag names. Must be passed to `feFeatureFlags(names: ...)`;
 * the backend only returns flags that are explicitly requested.
 */
export const FEATURE_FLAG_NAMES = [
  'organizationImages',
  'ssoAutoAllow',
  'billings',
  'thinking',
  'knowledge-base',
  'notifications',
  'tickets-board',
  'batch-approval',
] as const;

/**
 * Read a feature flag value from the server-loaded store,
 * falling back to the env-var default if the store hasn't loaded
 * or doesn't contain the flag.
 */
function getFlagValue(flagName: string, envFallback: () => boolean): boolean {
  const store = useFeatureFlagsStore.getState();
  if (store.isLoaded && flagName in store.flags) {
    return store.flags[flagName];
  }
  return envFallback();
}

/**
 * Feature flags management
 * Server-loaded via feFeatureFlags GraphQL query with env-var fallbacks
 */
export const featureFlags = {
  organizationImages: {
    enabled(): boolean {
      return getFlagValue('organizationImages', () => runtimeEnv.featureOrganizationImages());
    },
    uploadEnabled(): boolean {
      return this.enabled();
    },
    displayEnabled(): boolean {
      return this.enabled();
    },
  },
  ssoAutoAllow: {
    enabled(): boolean {
      return getFlagValue('ssoAutoAllow', () => runtimeEnv.featureSsoAllowDomain());
    },
  },
  subscription: {
    enabled(): boolean {
      return getFlagValue('billings', () => false);
    },
  },
  thinking: {
    enabled(): boolean {
      return getFlagValue('thinking', () => false);
    },
  },
  knowledgeBase: {
    enabled(): boolean {
      return getFlagValue('knowledge-base', () => false);
    },
  },
  notifications: {
    enabled(): boolean {
      return getFlagValue('notifications', () => false);
    },
  },
  ticketsBoard: {
    enabled(): boolean {
      return getFlagValue('tickets-board', () => false);
    },
  },
  batchApproval: {
    enabled(): boolean {
      return getFlagValue('batch-approval', () => false);
    },
  },
} as const;

/**
 * Feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags;
