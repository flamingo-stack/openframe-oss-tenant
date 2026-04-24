'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { UNLINK_ORGANIZATION_FROM_TICKET_MUTATION } from '../queries/ticket-queries';
import type { TicketPayload } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

async function unlinkOrganizationApi(ticketId: string) {
  const response = await apiClient.post<GraphQlResponse<{ unlinkOrganizationFromTicket: TicketPayload }>>(
    API_ENDPOINTS.GRAPHQL,
    {
      query: UNLINK_ORGANIZATION_FROM_TICKET_MUTATION,
      variables: { input: { id: ticketId } },
    },
  );

  const data = extractGraphQlData(response);
  const payload = data.unlinkOrganizationFromTicket;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return payload.ticket;
}

export function useUnlinkOrganization(onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlinkOrganizationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
      toast({ title: 'Success', description: 'Organization unlinked from ticket', variant: 'success' });
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to unlink organization',
        variant: 'destructive',
      });
    },
  });
}
