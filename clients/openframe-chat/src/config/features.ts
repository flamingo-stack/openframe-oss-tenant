export const FEATURE_FLAG_NAMES = ['dialog-stop', 'tickets', 'token-based-memory'] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  'dialog-stop': false,
  tickets: false,
  'token-based-memory': false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
