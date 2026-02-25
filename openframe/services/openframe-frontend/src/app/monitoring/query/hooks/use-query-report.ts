'use client';

import type { QueryResultRow } from '@flamingo-stack/openframe-frontend-core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { queriesQueryKeys } from '../../hooks/use-queries';
import type { QueryReportResponse } from '../../types/queries.types';

async function fetchQueryReport(queryId: number): Promise<QueryReportResponse> {
  const res = await fleetApiClient.getQueryReport(queryId);
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load query report (${res.status})`);
  }
  return res.data;
}

function flattenResults(results: QueryReportResponse['results']): QueryResultRow[] {
  return results.map(result => ({
    host_name: result.host_name,
    last_fetched: result.last_fetched,
    ...result.columns,
  }));
}

export function useQueryReport(queryId: number | null) {
  const query = useQuery({
    queryKey: [...queriesQueryKeys.detail(queryId!), 'report'],
    queryFn: () => fetchQueryReport(queryId!),
    enabled: queryId !== null,
  });

  const rows = useMemo(() => (query.data?.results ? flattenResults(query.data.results) : []), [query.data?.results]);

  return {
    rows,
    reportClipped: query.data?.report_clipped ?? false,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
