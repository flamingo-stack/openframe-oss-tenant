import { useQuery } from '@tanstack/react-query';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_NAMES, type FeatureFlags } from '../config/features';
import { featureFlagsService } from '../services/featureFlagsService';

export const featureFlagsQueryKey = ['featureFlags'] as const;

export function useFeatureFlagsQuery({ enabled }: { enabled: boolean }) {
  return useQuery<FeatureFlags>({
    queryKey: featureFlagsQueryKey,
    queryFn: async () => {
      const response = await featureFlagsService.fetchFeatureFlags(FEATURE_FLAG_NAMES);

      if (!response) {
        throw new Error('Failed to fetch feature flags');
      }

      const flags = { ...DEFAULT_FEATURE_FLAGS };
      for (const flag of response) {
        if (flag.name in flags) {
          flags[flag.name as keyof FeatureFlags] = flag.enabled;
        }
      }
      return flags;
    },
    enabled,
    retry: 1,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
