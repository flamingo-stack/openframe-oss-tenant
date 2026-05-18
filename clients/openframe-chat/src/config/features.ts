export const FEATURE_FLAG_NAMES = ['thinking', 'batch-approval'] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  thinking: false,
  'batch-approval': false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
