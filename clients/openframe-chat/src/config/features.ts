export const FEATURE_FLAG_NAMES = [
  'dialog-stop',
  'tickets',
  'token-based-memory',
  'thinking',
  'batch-approvals',
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  tickets: false,
  thinking: false,
  'batch-approvals': false,
};

export type FeatureFlags = Record<FeatureFlagName, boolean>;
