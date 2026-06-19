export const FEATURE_FLAG_NAMES = [
  'batch-approval',
  'customer-ai-assistant-settings',
  'notifications',
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  'batch-approval': false,
  'customer-ai-assistant-settings': false,
  notifications: false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
