'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { UNLINK_DEVICE_FROM_TICKET_MUTATION } from '../queries/ticket-queries';
import type { TicketPayload } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

async function unlinkDeviceApi(ticketId: string) {
  const response = await apiClient.post<GraphQlResponse<{ unlinkDeviceFromTicket: TicketPayload }>>(
    API_ENDPOINTS.GRAPHQL,
    {
      query: UNLINK_DEVICE_FROM_TICKET_MUTATION,
      variables: { input: { id: ticketId } },
    },
  );

  const data = extractGraphQlData(response);
  const payload = data.unlinkDeviceFromTicket;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return payload.ticket;
}

export function useUnlinkDevice(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlinkDeviceApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
      toast({ title: 'Success', description: 'Device unlinked from ticket', variant: 'success' });
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to unlink device',
        variant: 'destructive',
      });
    },
  });
}
