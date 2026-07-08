'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { GET_TICKET_STATISTICS_QUERY } from '../queries/ticket-queries';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { ticketsQueryKeys } from '../utils/query-keys';
import {
  resolvedCountFromStatistics,
  type TicketStatisticsCounts,
  totalCountFromStatistics,
} from '../utils/ticket-statistics';

interface TicketStatisticsResponse {
  ticketStatistics: TicketStatisticsCounts;
}

export function useTicketStatistics({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ticketsQueryKeys.statistics(),
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<TicketStatisticsResponse>>(API_ENDPOINTS.GRAPHQL, {
        query: GET_TICKET_STATISTICS_QUERY,
      });
      return extractGraphQlData(response);
    },
    enabled,
    staleTime: 60_000,
  });

  const resolvedCount = useMemo(() => resolvedCountFromStatistics(data?.ticketStatistics), [data]);
  const totalCount = useMemo(() => totalCountFromStatistics(data?.ticketStatistics), [data]);

  return { resolvedCount, totalCount, isLoading };
}
