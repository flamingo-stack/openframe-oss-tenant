'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { ASSIGN_TICKET_MUTATION, UNASSIGN_TICKET_MUTATION } from '../queries/ticket-queries';
import type { TicketPayload } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

interface AssignTicketParams {
  ticketId: string;
  assigneeId: string | null;
}

async function assignTicketApi({ ticketId, assigneeId }: AssignTicketParams) {
  if (assigneeId === null) {
    const response = await apiClient.post<GraphQlResponse<{ unassignTicket: TicketPayload }>>(API_ENDPOINTS.GRAPHQL, {
      query: UNASSIGN_TICKET_MUTATION,
      variables: { input: { id: ticketId } },
    });

    const data = extractGraphQlData(response);
    const payload = data.unassignTicket;

    if (payload.userErrors?.length) {
      throw new Error(payload.userErrors[0].message);
    }

    return payload.ticket;
  }

  const response = await apiClient.post<GraphQlResponse<{ assignTicket: TicketPayload }>>(API_ENDPOINTS.GRAPHQL, {
    query: ASSIGN_TICKET_MUTATION,
    variables: { input: { id: ticketId, assigneeId } },
  });

  const data = extractGraphQlData(response);
  const payload = data.assignTicket;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return payload.ticket;
}

export function useAssignTicket(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignTicketApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
      toast({ title: 'Success', description: 'Ticket updated successfully', variant: 'success' });
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update ticket assignment',
        variant: 'destructive',
      });
    },
  });
}
