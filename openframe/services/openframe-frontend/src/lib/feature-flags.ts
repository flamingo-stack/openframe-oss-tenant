import { useFeatureFlagsStore } from '@/stores/feature-flags-store';

/**
 * Server-known flag names. Must be passed to `feFeatureFlags(names: ...)`;
 * the backend only returns flags that are explicitly requested.
 */
export const FEATURE_FLAG_NAMES = [
  'billings',
  'thinking',
  'knowledge-base',
  'notifications',
  'tickets-board',
  'batch-approval',
  'ai-streaming-jetstream',
  'debug-nats-chunks',
  'mingo-sidebar',
  'ticket-statuses',
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
  aiStreamingJetstream: {
    enabled(): boolean {
      return getFlagValue('ai-streaming-jetstream', () => false);
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
  ticketStatuses: {
    enabled(): boolean {
      return getFlagValue('ticket-statuses', () => false);
    },
  },
} as const;

/**
 * Feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags;
