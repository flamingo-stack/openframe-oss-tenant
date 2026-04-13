'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { type FeatureFlag, useFeatureFlagsStore } from '@/stores/feature-flags-store';

const FE_FEATURE_FLAGS_QUERY = `
  query FeFeatureFlags {
    feFeatureFlags {
      name
      enabled
    }
  }
`;

export const featureFlagsQueryKey = ['featureFlags'] as const;

interface FeFeatureFlagsResponse {
  data?: {
    feFeatureFlags: FeatureFlag[];
  };
  errors?: Array<{ message: string }>;
}

export function useFeatureFlagsQuery({ enabled }: { enabled: boolean }) {
  const setFlags = useFeatureFlagsStore(s => s.setFlags);
  const setLoaded = useFeatureFlagsStore(s => s.setLoaded);

  const query = useQuery<FeatureFlag[]>({
    queryKey: featureFlagsQueryKey,
    queryFn: async () => {
      const response = await apiClient.post<FeFeatureFlagsResponse>('/api/graphql', {
        query: FE_FEATURE_FLAGS_QUERY,
      });

      if (!response.ok || response.data?.errors?.length) {
        const errorMessage = response.data?.errors?.[0]?.message || response.error || 'Failed to fetch feature flags';
        throw new Error(errorMessage);
      }

      return response.data?.data?.feFeatureFlags ?? [];
    },
    enabled,
    retry: 1,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) {
      setFlags(query.data);
    }
  }, [query.data, setFlags]);

  useEffect(() => {
    if (query.isError) {
      console.error('[FeatureFlags] Failed to fetch feature flags, using defaults:', query.error);
      setLoaded();
    }
  }, [query.isError, query.error, setLoaded]);

  return query;
}
