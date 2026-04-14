'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { API_ENDPOINTS } from '../constants';
import { GET_TICKET_STATISTICS_QUERY } from '../queries/ticket-queries';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { ticketsQueryKeys } from '../utils/query-keys';

interface StatusCount {
  status: string;
  count: number;
}

interface TicketStatisticsResponse {
  ticketStatistics: {
    statusCounts: StatusCount[];
  };
}

export function useTicketStatistics({ enabled = true }: { enabled?: boolean } = {}) {
  const isTicketsEnabled = featureFlags.tickets.enabled();

  const { data, isLoading } = useQuery({
    queryKey: ticketsQueryKeys.statistics(),
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<TicketStatisticsResponse>>(API_ENDPOINTS.GRAPHQL, {
        query: GET_TICKET_STATISTICS_QUERY,
      });
      return extractGraphQlData(response);
    },
    enabled: enabled && isTicketsEnabled,
    staleTime: 60_000,
  });

  const resolvedCount = useMemo(() => {
    const counts = data?.ticketStatistics?.statusCounts ?? [];
    return counts.find(sc => sc.status === 'RESOLVED')?.count ?? 0;
  }, [data]);

  return { resolvedCount, isLoading };
}
