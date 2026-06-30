'use client';

import { useQuery } from '@tanstack/react-query';
import type { HostQueryReport } from '@/app/(app)/monitoring/types/queries.types';
import { fleetApiClient } from '@/lib/fleet-api-client';

const EMPTY_REPORTS: HostQueryReport[] = [];

export const hostQueriesKeys = {
  detail: (hostId: number) => ['fleet', 'hosts', hostId, 'queries'] as const,
};

/**
 * Queries linked to a specific Fleet host via `GET /fleet/hosts/{id}/queries` — the only
 * endpoint that filters by host id. Returns per-host report rows (`report_id` is the query
 * id, plus `last_fetched`/`n_host_results`). Frequency is NOT here — join with the global
 * `/fleet/queries` list by id to get `interval`.
 */
async function fetchHostQueries(hostId: number): Promise<HostQueryReport[]> {
  const res = await fleetApiClient.getHostQueries(hostId);
  if (!res.ok) {
    throw new Error(res.error || `Failed to load host queries (${res.status})`);
  }
  return res.data?.reports ?? EMPTY_REPORTS;
}

/** Host-scoped query reports. Disabled (no fetch) when the device has no Fleet host id. */
export function useHostQueries(hostId: number | undefined) {
  const query = useQuery({
    queryKey: hostQueriesKeys.detail(hostId ?? 0),
    queryFn: () => fetchHostQueries(hostId!),
    enabled: !!hostId,
  });

  // Return a referentially stable `data` while loading/disabled. An inline `?? []` at the
  // call site would be a fresh array every render, which — as a memo dep feeding
  // `useDataTable` — drives an infinite render loop.
  return { ...query, data: query.data ?? EMPTY_REPORTS };
}
