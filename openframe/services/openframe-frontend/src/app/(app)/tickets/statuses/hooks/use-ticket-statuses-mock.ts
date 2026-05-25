'use client';

import { TICKET_STATUS_COLOR_PRESETS } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomTicketStatus, TicketStatusesPayload } from '../types/ticket-statuses.types';

const RED = TICKET_STATUS_COLOR_PRESETS[0];

let mockStatuses: CustomTicketStatus[] = [
  { kind: 'custom', id: 'on-hold', label: 'On Hold', color: RED.color, preset: RED.key },
];

export const ticketStatusesQueryKeys = {
  all: ['ticket-statuses'] as const,
};

export function useTicketStatusesQuery() {
  return useQuery<TicketStatusesPayload>({
    queryKey: ticketStatusesQueryKeys.all,
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 50));
      return { customStatuses: mockStatuses };
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useUpdateTicketStatusesMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TicketStatusesPayload) => {
      await new Promise(r => setTimeout(r, 200));
      mockStatuses = payload.customStatuses;
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketStatusesQueryKeys.all });
      toast({ title: 'Saved', description: 'Ticket statuses updated', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save ticket statuses',
        variant: 'destructive',
      });
    },
  });
}
