export const FEATURE_FLAG_NAMES = ['tickets', 'thinking'] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  tickets: false,
  thinking: false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
