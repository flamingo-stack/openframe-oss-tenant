'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fleetApiClient, type Host } from '@/lib/fleet-api-client';
import type { Policy } from '../types/policies.types';
import type { PolicySummaryStats } from '../types/policy-summary.types';
import { computePolicySummary } from '../utils/compute-policy-summary';

// ============ Query Keys ============

export const policySummaryQueryKeys = {
  all: ['policy-summary'] as const,
  policies: () => [...policySummaryQueryKeys.all, 'policies'] as const,
  hostDedup: (policyIds: number[]) => [...policySummaryQueryKeys.all, 'host-dedup', policyIds] as const,
};

// ============ API Functions ============

async function fetchPoliciesForSummary(): Promise<Policy[]> {
  const res = await fleetApiClient.getPolicies();
  if (!res.ok) {
    throw new Error(res.error || `Failed to load policies (${res.status})`);
  }
  return (res.data as { policies: Policy[] })?.policies ?? [];
}

/**
 * Fetch failing hosts for each policy that has failures, and all assigned hosts
 * for each policy that has any assignments. Returns deduplicated host ID sets.
 */
async function fetchDedupedHostIds(policies: Policy[]): Promise<{
  nonCompliantHostIds: Set<number>;
  totalAssignedHostIds: Set<number>;
}> {
  const nonCompliantHostIds = new Set<number>();
  const totalAssignedHostIds = new Set<number>();

  const policiesWithFailures = policies.filter(p => p.failing_host_count > 0);
  const policiesWithAssignments = policies.filter(p => p.passing_host_count + p.failing_host_count > 0);

  const failingHostPromises = policiesWithFailures.map(async policy => {
    const res = await fleetApiClient.getHosts({
      policy_id: policy.id,
      policy_response: 'failing',
      per_page: 500,
      disable_failing_policies: true,
    });
    if (!res.ok) return [];
    return res.data?.hosts ?? [];
  });

  const assignedHostPromises = policiesWithAssignments.map(async policy => {
    const allHosts: { id: number }[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await fleetApiClient.getPolicyHosts(policy.id, { page, per_page: 500 });
      if (!res.ok) break;
      const hosts = res.data?.hosts ?? [];
      allHosts.push(...hosts);
      hasMore = res.data?.meta?.has_next_results ?? false;
      page++;
    }

    return allHosts;
  });

  const [failingResults, assignedResults] = await Promise.all([
    Promise.all(failingHostPromises),
    Promise.all(assignedHostPromises),
  ]);

  for (const hosts of failingResults) {
    for (const host of hosts) {
      nonCompliantHostIds.add(host.id);
    }
  }

  for (const hosts of assignedResults) {
    for (const host of hosts) {
      totalAssignedHostIds.add(host.id);
    }
  }

  return { nonCompliantHostIds, totalAssignedHostIds };
}

// ============ Hook ============

export function usePolicySummary() {
  const policiesQuery = useQuery({
    queryKey: policySummaryQueryKeys.policies(),
    queryFn: fetchPoliciesForSummary,
    staleTime: 2 * 60 * 1000,
  });

  const policies = policiesQuery.data ?? [];
  const policyIds = useMemo(() => policies.map(p => p.id).sort(), [policies]);

  const hostDedupQuery = useQuery({
    queryKey: policySummaryQueryKeys.hostDedup(policyIds),
    queryFn: () => fetchDedupedHostIds(policies),
    enabled: policies.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const summary: PolicySummaryStats = useMemo(
    () =>
      computePolicySummary(
        policies,
        hostDedupQuery.data?.nonCompliantHostIds,
        hostDedupQuery.data?.totalAssignedHostIds,
      ),
    [policies, hostDedupQuery.data],
  );

  return {
    ...summary,
    isLoading: policiesQuery.isLoading,
    isLoadingHosts: hostDedupQuery.isLoading,
    error: policiesQuery.error?.message ?? hostDedupQuery.error?.message ?? null,
    refetch: async () => {
      await policiesQuery.refetch();
      await hostDedupQuery.refetch();
    },
  };
}
