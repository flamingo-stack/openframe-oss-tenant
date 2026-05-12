'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../services';
import type { TicketStatusTransition } from '../services/ticket-service.types';
import { ticketsQueryKeys } from '../utils/query-keys';

export function useTicketStatusTransitions() {
  return useQuery<TicketStatusTransition[], Error>({
    queryKey: ticketsQueryKeys.statusTransitions(),
    queryFn: () => ticketService.fetchTicketStatusTransitions(),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
