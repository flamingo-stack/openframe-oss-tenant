'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '../services';
import { invalidateAllDialogs, ticketsQueryKeys } from '../utils/query-keys';

export interface TransitionTicketInput {
  ticketId: string;
  toStatusId: string;
}

export function useTransitionTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, toStatusId }: TransitionTicketInput) =>
      ticketService.transitionTicket(ticketId, toStatusId),
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.detail(ticketId) });
      invalidateAllDialogs(queryClient);
      toast({ title: 'Status updated', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update status',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });
}
