'use client';

import { useQuery } from '@tanstack/react-query';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { queriesQueryKeys } from '../../hooks/use-queries';
import type { Query } from '../../types/queries.types';

async function fetchQuery(id: number): Promise<Query> {
  const res = await fleetApiClient.getQuery(id);
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load query (${res.status})`);
  }
  // Fleet API wraps response in { query: {...} } — cast to avoid conflict with Query.query field
  return (res.data as unknown as { query: Query }).query;
}

export function useQueryDetails(queryId: number | null) {
  const query = useQuery({
    queryKey: queriesQueryKeys.detail(queryId!),
    queryFn: () => fetchQuery(queryId!),
    enabled: queryId !== null,
  });

  return {
    queryDetails: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
