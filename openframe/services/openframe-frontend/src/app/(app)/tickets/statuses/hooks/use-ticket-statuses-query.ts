'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../../constants';
import { extractGraphQlData, type GraphQlResponse } from '../../utils/graphql';
import { ticketsQueryKeys } from '../../utils/query-keys';
import { GET_TICKET_STATUSES_QUERY } from '../queries/ticket-statuses-queries';
import {
  type CustomTicketStatus,
  mapDefinitionToCustom,
  mapDefinitionToSystem,
  type SystemTicketStatus,
  type TicketStatusDefinition,
} from '../types/ticket-statuses.types';

export interface TicketStatusesData {
  systemStatuses: SystemTicketStatus[];
  customStatuses: CustomTicketStatus[];
  snapshot: TicketStatusDefinition[];
}

// Fractional-index positions are compared bytewise, not locale-aware.
function byPosition(a: TicketStatusDefinition, b: TicketStatusDefinition): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

export function useTicketStatusesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<TicketStatusesData>({
    queryKey: ticketsQueryKeys.statuses(),
    enabled,
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<{ ticketStatuses: TicketStatusDefinition[] }>>(
        API_ENDPOINTS.GRAPHQL,
        { query: GET_TICKET_STATUSES_QUERY },
      );
      const { ticketStatuses } = extractGraphQlData(response);
      const ordered = [...ticketStatuses].sort(byPosition);

      return {
        systemStatuses: ordered.filter(d => d.isSystem).map(mapDefinitionToSystem),
        customStatuses: ordered.filter(d => !d.isSystem).map(mapDefinitionToCustom),
        snapshot: ordered,
      };
    },
  });
}
