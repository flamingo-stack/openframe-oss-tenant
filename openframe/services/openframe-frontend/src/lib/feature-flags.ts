import { useFeatureFlagsStore } from '@/stores/feature-flags-store';
import { runtimeEnv } from './runtime-config';

/**
 * Server-known flag names. Must be passed to `feFeatureFlags(names: ...)`;
 * the backend only returns flags that are explicitly requested.
 */
export const FEATURE_FLAG_NAMES = [
  'billings',
  'help-center',
  'notifications',
  'batch-approval',
  'debug-nats-chunks',
  'mingo-sidebar',
  'mingo-sidebar-context',
  'mingo-ai-chat-settings',
  'customer-ai-assistant-settings',
  'time-tracker',
  'scripts-v2',
  'cancel-subscription',
  'new-onboarding',
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
  subscription: {
    enabled(): boolean {
      return getFlagValue('billings', () => false);
    },
  },
  helpCenter: {
    enabled(): boolean {
      return getFlagValue('help-center', () => false);
    },
  },
  notifications: {
    enabled(): boolean {
      return getFlagValue('notifications', () => false);
    },
  },
  batchApproval: {
    enabled(): boolean {
      return getFlagValue('batch-approval', () => false);
    },
  },
  debugNatsChunks: {
    enabled(): boolean {
      return getFlagValue('debug-nats-chunks', () => false);
    },
  },
  mingoSidebar: {
    enabled(): boolean {
      return getFlagValue('mingo-sidebar', () => false);
    },
  },
  mingoSidebarContext: {
    enabled(): boolean {
      return getFlagValue('mingo-sidebar-context', () => false);
    },
  },
  mingoAiChatSettings: {
    enabled(): boolean {
      return getFlagValue('mingo-ai-chat-settings', () => false);
    },
  },
  customerAiAssistantSettings: {
    enabled(): boolean {
      return getFlagValue('customer-ai-assistant-settings', () => false);
    },
  },
  timeTracker: {
    enabled(): boolean {
      return getFlagValue('time-tracker', () => false);
    },
  },
  scriptsV2: {
    enabled(): boolean {
      return getFlagValue('scripts-v2', () => false);
    },
  },
  cancelSubscription: {
    enabled(): boolean {
      return getFlagValue('cancel-subscription', () => false);
    },
  },
  /**
   * New `/onboarding` page. When enabled, the standalone onboarding route is shown
   * and the legacy dashboard `OnboardingSection` is hidden; when disabled it's the
   * reverse (legacy section on the dashboard, `/onboarding` 404s).
   */
  newOnboarding: {
    enabled(): boolean {
      return getFlagValue('new-onboarding', () => runtimeEnv.newOnboardingFlag());
    },
  },
} as const;

/**
 * Feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags;
