export const FEATURE_FLAG_NAMES = [
  'thinking',
  'batch-approval',
  'ai-streaming-jetstream',
  'ticket-statuses',
  'customer-ai-assistant-settings',
  'notifications',
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  thinking: false,
  'batch-approval': false,
  'ai-streaming-jetstream': false,
  'ticket-statuses': false,
  'customer-ai-assistant-settings': false,
  notifications: false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
