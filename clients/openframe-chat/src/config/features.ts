export const FEATURE_FLAG_NAMES = ['dialog-stop', 'tickets'] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  'dialog-stop': false,
  tickets: false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
