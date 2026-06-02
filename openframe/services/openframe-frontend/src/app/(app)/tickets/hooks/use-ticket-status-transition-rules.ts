'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../services';
import type { TicketStatusTransitionRule } from '../services/ticket-service.types';
import { ticketsQueryKeys } from '../utils/query-keys';

export function useTicketStatusTransitionRules() {
  return useQuery<TicketStatusTransitionRule[], Error>({
    queryKey: ticketsQueryKeys.statusTransitionRules(),
    queryFn: () => ticketService.fetchTicketStatusTransitionRules(),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
