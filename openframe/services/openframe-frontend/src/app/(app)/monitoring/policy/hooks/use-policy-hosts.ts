'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fleetApiClient, type PolicyHost } from '@/lib/fleet-api-client';
import { handleApiError } from '@/lib/handle-api-error';
import { policiesQueryKeys } from '../../hooks/use-policies';

// ============ Query Keys ============

export const policyHostsQueryKeys = {
  all: ['policy-hosts'] as const,
  list: (policyId: number) => [...policyHostsQueryKeys.all, 'list', policyId] as const,
};

// ============ API Functions ============

async function fetchAllPolicyHosts(policyId: number): Promise<PolicyHost[]> {
  const allHosts: PolicyHost[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await fleetApiClient.getPolicyHosts(policyId, { page, per_page: 100 });
    if (!res.ok) {
      throw new Error(res.error || `Failed to load policy hosts (${res.status})`);
    }
    const hosts = res.data?.hosts ?? [];
    allHosts.push(...hosts);
    hasMore = res.data?.meta?.has_next_results ?? false;
    page++;
  }

  return allHosts;
}

async function replacePolicyHostsApi(params: { policyId: number; hostIds: number[] }): Promise<void> {
  const res = await fleetApiClient.replacePolicyHosts(params.policyId, params.hostIds);
  if (!res.ok) {
    throw new Error(res.error || `Failed to update policy hosts (${res.status})`);
  }
}

// ============ Hooks ============

export function usePolicyHosts(policyId: number | null) {
  const query = useQuery({
    queryKey: policyHostsQueryKeys.list(policyId!),
    queryFn: () => fetchAllPolicyHosts(policyId!),
    enabled: policyId !== null,
  });

  return {
    hosts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useReplacePolicyHosts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: replacePolicyHostsApi,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: policyHostsQueryKeys.list(variables.policyId) });
      queryClient.invalidateQueries({ queryKey: policiesQueryKeys.all });
    },
    onError: error => {
      handleApiError(error, toast, 'Failed to assign devices to policy');
    },
  });
}
