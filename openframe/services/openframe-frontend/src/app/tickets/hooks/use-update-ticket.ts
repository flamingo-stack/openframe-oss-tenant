'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { UPDATE_TICKET_MUTATION } from '../queries/ticket-queries';
import type { TicketPayload, UpdateTicketInput } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

async function updateTicketApi(input: UpdateTicketInput) {
  const response = await apiClient.post<GraphQlResponse<{ updateTicket: TicketPayload }>>(API_ENDPOINTS.GRAPHQL, {
    query: UPDATE_TICKET_MUTATION,
    variables: { input },
  });

  const data = extractGraphQlData(response);
  const payload = data.updateTicket;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return payload.ticket;
}

export function useUpdateTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: updateTicketApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
      toast({ title: 'Success', description: 'Ticket updated successfully', variant: 'success' });
      router.push('/tickets');
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update ticket',
        variant: 'destructive',
      });
    },
  });
}
