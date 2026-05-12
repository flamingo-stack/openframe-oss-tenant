'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '../services';
import type { ReorderTicketParams } from '../services/ticket-service.types';
import { invalidateAllDialogs } from '../utils/query-keys';

export function useReorderTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReorderTicketParams) => ticketService.reorderTicket(params),
    onSuccess: () => {
      invalidateAllDialogs(queryClient);
    },
    onError: err => {
      invalidateAllDialogs(queryClient);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to reorder ticket',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });
}
