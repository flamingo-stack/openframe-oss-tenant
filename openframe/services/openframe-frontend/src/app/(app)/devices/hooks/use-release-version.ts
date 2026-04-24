'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

type ReleaseVersionResponse = {
  releaseVersion?: string;
};

export const releaseVersionQueryKeys = {
  all: ['releaseVersion'] as const,
  detail: () => [...releaseVersionQueryKeys.all, 'detail'] as const,
};

async function fetchReleaseVersion(): Promise<string> {
  const response = await apiClient.get<ReleaseVersionResponse>('/api/release-version');

  if (!response.ok) {
    throw new Error(response.error || `Request failed with status ${response.status}`);
  }

  return response.data?.releaseVersion?.trim() || 'latest';
}

interface UseReleaseVersionOptions {
  /**
   * When false, the query is disabled until manually enabled.
   */
  enabled?: boolean;
}

export function useReleaseVersion(options: UseReleaseVersionOptions = {}) {
  const { toast } = useToast();
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: releaseVersionQueryKeys.detail(),
    queryFn: fetchReleaseVersion,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  if (query.error && enabled) {
    toast({
      title: 'Failed to load release version',
      description: query.error.message,
      variant: 'destructive',
    });
  }

  return {
    releaseVersion: query.data ?? 'latest',
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,

    isSuccess: query.isSuccess,
    isFetching: query.isFetching,

    query,
  };
}
