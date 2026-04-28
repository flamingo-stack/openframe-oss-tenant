'use client';

import { useQuery } from '@tanstack/react-query';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { policiesQueryKeys } from '../../hooks/use-policies';
import type { Policy } from '../../types/policies.types';

async function fetchPolicy(id: number): Promise<Policy> {
  const res = await fleetApiClient.getPolicy(id);
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load policy (${res.status})`);
  }
  return res.data.policy;
}

export function usePolicyDetails(policyId: number | null) {
  const query = useQuery({
    queryKey: policiesQueryKeys.detail(policyId!),
    queryFn: () => fetchPolicy(policyId!),
    enabled: policyId !== null,
  });

  return {
    policyDetails: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
