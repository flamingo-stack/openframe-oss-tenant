'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../services';
import type { Dialog } from '../types/dialog.types';
import { ticketsQueryKeys } from '../utils/query-keys';

export function useTicketDetail(ticketId: string | null | undefined) {
  const query = useQuery<Dialog | null, Error>({
    queryKey: ticketId ? ticketsQueryKeys.detail(ticketId) : ['tickets', 'detail', '__none__'],
    queryFn: () => ticketService.fetchDialog(ticketId as string),
    enabled: !!ticketId,
    staleTime: 30_000,
  });

  return {
    ticket: query.data ?? null,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
