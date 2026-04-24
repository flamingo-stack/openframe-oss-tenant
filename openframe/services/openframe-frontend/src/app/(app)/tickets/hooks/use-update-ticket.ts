'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import {
  ASSIGN_TICKET_MUTATION,
  UNASSIGN_TICKET_MUTATION,
  UNLINK_DEVICE_FROM_TICKET_MUTATION,
  UNLINK_ORGANIZATION_FROM_TICKET_MUTATION,
  UPDATE_TICKET_MUTATION,
} from '../queries/ticket-queries';
import type { Ticket, TicketPayload, UpdateTicketInput } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

async function runTicketMutation<K extends string>(
  query: string,
  variables: Record<string, unknown>,
  key: K,
): Promise<Ticket | null> {
  const response = await apiClient.post<GraphQlResponse<Record<K, TicketPayload>>>(API_ENDPOINTS.GRAPHQL, {
    query,
    variables,
  });

  const data = extractGraphQlData(response);
  const payload = data[key];

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return payload.ticket;
}

async function updateTicketApi(input: UpdateTicketInput): Promise<Ticket | null> {
  const { id, deviceId, organizationId, assigneeId, ...rest } = input;
  let latest: Ticket | null = null;

  if (organizationId === null) {
    latest = await runTicketMutation(
      UNLINK_ORGANIZATION_FROM_TICKET_MUTATION,
      { input: { id } },
      'unlinkOrganizationFromTicket',
    );
  }

  if (deviceId === null) {
    latest = await runTicketMutation(UNLINK_DEVICE_FROM_TICKET_MUTATION, { input: { id } }, 'unlinkDeviceFromTicket');
  }

  if (assigneeId === null) {
    latest = await runTicketMutation(UNASSIGN_TICKET_MUTATION, { input: { id } }, 'unassignTicket');
  } else if (typeof assigneeId === 'string') {
    latest = await runTicketMutation(ASSIGN_TICKET_MUTATION, { input: { id, assigneeId } }, 'assignTicket');
  }

  const updateInput: UpdateTicketInput = { id, ...rest };
  if (typeof deviceId === 'string') updateInput.deviceId = deviceId;
  if (typeof organizationId === 'string') updateInput.organizationId = organizationId;

  const hasFieldsToUpdate = Object.keys(updateInput).some(
    k => k !== 'id' && updateInput[k as keyof UpdateTicketInput] !== undefined,
  );

  if (hasFieldsToUpdate) {
    latest = await runTicketMutation(UPDATE_TICKET_MUTATION, { input: updateInput }, 'updateTicket');
  }

  return latest;
}

export function useUpdateTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: updateTicketApi,
    onSuccess: ticket => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
      toast({ title: 'Success', description: 'Ticket updated successfully', variant: 'success' });
      if (ticket?.id) {
        router.push(`/tickets/dialog?id=${ticket.id}`);
      } else {
        router.push('/tickets');
      }
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
