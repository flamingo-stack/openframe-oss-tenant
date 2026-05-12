'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ticketService } from '../services';
import type { BoardStatus } from '../services/ticket-service.types';
import {
  applyOptimisticMove,
  type OptimisticMoveInput,
  type OptimisticMoveSnapshot,
  rollbackOptimisticMove,
} from '../utils/optimistic-board';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';

export interface MoveTicketParams {
  ticketId: string;
  sourceStatus: BoardStatus;
  targetStatus: BoardStatus;
  afterTicketId: string | null;
  beforeTicketId: string | null;
}

const MOVE_TICKET_MUTATION_KEY = ['tickets-board', 'move'] as const;

async function moveTicketRequest(params: MoveTicketParams): Promise<void> {
  const isCrossColumn = params.sourceStatus !== params.targetStatus;
  const hasAnchor = params.afterTicketId !== null || params.beforeTicketId !== null;

  if (isCrossColumn && !hasAnchor) {
    await ticketService.mutateStatus(params.ticketId, params.targetStatus);
    return;
  }

  await ticketService.reorderTicket({
    id: params.ticketId,
    afterTicketId: params.afterTicketId,
    beforeTicketId: params.beforeTicketId,
    status: isCrossColumn ? params.targetStatus : undefined,
  });
}

export function useMoveTicket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<void, Error, MoveTicketParams, OptimisticMoveSnapshot>({
    mutationKey: MOVE_TICKET_MUTATION_KEY,
    scope: { id: 'tickets-board-move' },
    mutationFn: moveTicketRequest,
    onMutate: async params => {
      await queryClient.cancelQueries({ queryKey: dialogsQueryKeys.boardColumns() });
      const input: OptimisticMoveInput = {
        ticketId: params.ticketId,
        sourceStatus: params.sourceStatus,
        targetStatus: params.targetStatus,
        afterTicketId: params.afterTicketId,
        beforeTicketId: params.beforeTicketId,
      };
      return applyOptimisticMove(queryClient, input);
    },
    onError: (err, _params, snapshot) => {
      if (snapshot) rollbackOptimisticMove(queryClient, snapshot);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to move ticket',
        variant: 'destructive',
        duration: 5000,
      });
    },
    onSettled: (_data, _err, params) => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.detail(params.ticketId) });
    },
  });
}

export function useMovingTicketIds(): Set<string> {
  const pending = useMutationState<string>({
    filters: { mutationKey: MOVE_TICKET_MUTATION_KEY, status: 'pending' },
    select: m => (m.state.variables as MoveTicketParams | undefined)?.ticketId ?? '',
  });
  return useMemo(() => new Set(pending.filter(Boolean)), [pending]);
}
