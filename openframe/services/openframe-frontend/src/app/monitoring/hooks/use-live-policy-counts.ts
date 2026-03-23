'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fleetApiClient } from '@/lib/fleet-api-client';

export interface LivePolicyCounts {
  failing: number;
  passing: number;
}

export type LivePolicyCountsMap = Map<number, LivePolicyCounts>;

async function fetchLivePolicyCounts(policyIds: number[]): Promise<LivePolicyCountsMap> {
  const countsMap: LivePolicyCountsMap = new Map();

  const promises = policyIds.flatMap(id => [
    fleetApiClient.getHostsCount({ policy_id: id, policy_response: 'failing' }).then(res => ({
      id,
      type: 'failing' as const,
      count: res.ok ? (res.data?.count ?? 0) : 0,
    })),
    fleetApiClient.getHostsCount({ policy_id: id, policy_response: 'passing' }).then(res => ({
      id,
      type: 'passing' as const,
      count: res.ok ? (res.data?.count ?? 0) : 0,
    })),
  ]);

  const results = await Promise.all(promises);

  for (const { id, type, count } of results) {
    const existing = countsMap.get(id) ?? { failing: 0, passing: 0 };
    existing[type] = count;
    countsMap.set(id, existing);
  }

  return countsMap;
}

export const livePolicyCountsQueryKeys = {
  all: ['live-policy-counts'] as const,
  forPolicies: (policyIds: number[]) => [...livePolicyCountsQueryKeys.all, policyIds] as const,
};

export function useLivePolicyCounts(policyIds: number[]) {
  const stableIds = useMemo(() => [...policyIds].sort(), [policyIds]);

  const query = useQuery({
    queryKey: livePolicyCountsQueryKeys.forPolicies(stableIds),
    queryFn: () => fetchLivePolicyCounts(stableIds),
    enabled: stableIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    countsMap: query.data ?? new Map<number, LivePolicyCounts>(),
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
