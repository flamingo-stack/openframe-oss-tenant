import { useFeatureFlagsStore } from '@/stores/feature-flags-store';
import { runtimeEnv } from './runtime-config';

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
  dialogStop: {
    enabled(): boolean {
      return getFlagValue('dialog-stop', () => false);
    },
  },
} as const;

/**
 * Feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags;
