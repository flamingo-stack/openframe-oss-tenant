'use client';

import { useQuery } from '@tanstack/react-query';
import { fleetApiClient, type Host } from '@/lib/fleet-api-client';

const EMPTY_HOSTS: Host[] = [];

export const policyResponseHostsQueryKeys = {
  all: ['policy-response-hosts'] as const,
  list: (policyId: number, response: 'passing' | 'failing') =>
    [...policyResponseHostsQueryKeys.all, policyId, response] as const,
};

async function fetchPolicyResponseHosts(policyId: number, policyResponse: 'passing' | 'failing'): Promise<Host[]> {
  const res = await fleetApiClient.getHosts({
    policy_id: policyId,
    policy_response: policyResponse,
    per_page: 100,
    disable_failing_policies: true,
  });
  if (!res.ok) {
    throw new Error(res.error || `Failed to load ${policyResponse} hosts (${res.status})`);
  }
  return res.data?.hosts ?? [];
}

export function usePolicyResponseHosts(policyId: number | null, policyResponse: 'passing' | 'failing') {
  const query = useQuery({
    queryKey: policyResponseHostsQueryKeys.list(policyId!, policyResponse),
    queryFn: () => fetchPolicyResponseHosts(policyId!, policyResponse),
    enabled: policyId !== null,
  });

  return {
    hosts: query.data ?? EMPTY_HOSTS,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
