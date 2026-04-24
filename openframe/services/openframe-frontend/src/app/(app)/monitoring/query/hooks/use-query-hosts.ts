'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fleetApiClient, type PolicyHost } from '@/lib/fleet-api-client';
import { handleApiError } from '@/lib/handle-api-error';
import { queriesQueryKeys } from '../../hooks/use-queries';

// ============ Query Keys ============

export const queryHostsQueryKeys = {
  all: ['query-hosts'] as const,
  list: (queryId: number) => [...queryHostsQueryKeys.all, 'list', queryId] as const,
};

// ============ API Functions ============

async function fetchAllQueryHosts(queryId: number): Promise<PolicyHost[]> {
  const allHosts: PolicyHost[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await fleetApiClient.getQueryHosts(queryId, { page, per_page: 100 });
    if (!res.ok) {
      throw new Error(res.error || `Failed to load query hosts (${res.status})`);
    }
    const hosts = res.data?.hosts ?? [];
    allHosts.push(...hosts);
    hasMore = res.data?.meta?.has_next_results ?? false;
    page++;
  }

  return allHosts;
}

async function replaceQueryHostsApi(params: { queryId: number; hostIds: number[] }): Promise<void> {
  const res = await fleetApiClient.replaceQueryHosts(params.queryId, params.hostIds);
  if (!res.ok) {
    throw new Error(res.error || `Failed to update query hosts (${res.status})`);
  }
}

// ============ Hooks ============

export function useQueryHosts(queryId: number | null) {
  const query = useQuery({
    queryKey: queryHostsQueryKeys.list(queryId!),
    queryFn: () => fetchAllQueryHosts(queryId!),
    enabled: queryId !== null,
  });

  return {
    hosts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useReplaceQueryHosts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: replaceQueryHostsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryHostsQueryKeys.list(variables.queryId) });
      queryClient.invalidateQueries({ queryKey: queriesQueryKeys.detail(variables.queryId) });
    },
    onError: error => {
      handleApiError(error, toast, 'Failed to assign devices to query');
    },
  });
}
