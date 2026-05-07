'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ticketService } from '../services';
import type { DialogStatus } from '../types/dialog.types';
import { invalidateAllDialogs } from '../utils/query-keys';

export function useTicketStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTicketStatus = useCallback(
    async (ticketId: string, status: DialogStatus): Promise<DialogStatus | null> => {
      if (isUpdating) return null;

      setIsUpdating(true);

      try {
        const nextStatus = await ticketService.mutateStatus(ticketId, status);

        if (nextStatus) {
          invalidateAllDialogs(queryClient);
        }

        return nextStatus;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update ticket status';
        console.error('Failed to update ticket status:', error);

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });

        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating, toast, queryClient],
  );

  const putOnHold = useCallback(
    async (ticketId: string) => {
      return updateTicketStatus(ticketId, 'ON_HOLD');
    },
    [updateTicketStatus],
  );

  const resolve = useCallback(
    async (ticketId: string) => {
      return updateTicketStatus(ticketId, 'RESOLVED');
    },
    [updateTicketStatus],
  );

  const activate = useCallback(
    async (ticketId: string) => {
      return updateTicketStatus(ticketId, 'ACTIVE');
    },
    [updateTicketStatus],
  );

  const archive = useCallback(
    async (ticketId: string) => {
      return updateTicketStatus(ticketId, 'ARCHIVED');
    },
    [updateTicketStatus],
  );

  return {
    updateTicketStatus,
    putOnHold,
    resolve,
    activate,
    archive,
    isUpdating,
  };
}
