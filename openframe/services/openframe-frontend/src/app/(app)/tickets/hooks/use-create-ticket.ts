'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { CREATE_TICKET_MUTATION } from '../queries/ticket-queries';
import type { CreateTicketInput, TicketPayload } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

async function createTicketApi(input: CreateTicketInput) {
  const response = await apiClient.post<GraphQlResponse<{ createTicket: TicketPayload }>>(API_ENDPOINTS.GRAPHQL, {
    query: CREATE_TICKET_MUTATION,
    variables: { input },
  });

  const data = extractGraphQlData(response);
  const payload = data.createTicket;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return payload.ticket;
}

export function useCreateTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createTicketApi,
    onSuccess: ticket => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
      toast({ title: 'Success', description: 'Ticket created successfully', variant: 'success' });
      if (ticket?.id) {
        router.push(`/tickets/dialog?id=${ticket.id}`);
      } else {
        router.push('/tickets');
      }
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create ticket',
        variant: 'destructive',
      });
    },
  });
}
