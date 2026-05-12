'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ticketService } from '../services';
import type { BoardStatus, TicketsBoardPage } from '../services/ticket-service.types';
import type { Dialog } from '../types/dialog.types';
import { dialogsQueryKeys } from '../utils/query-keys';

export const BOARD_INITIAL_PAGE_SIZE = 20;
export const BOARD_LOAD_MORE_PAGE_SIZE = 20;

export const BOARD_STATUSES: readonly BoardStatus[] = ['ACTIVE', 'TECH_REQUIRED', 'ON_HOLD', 'RESOLVED'] as const;

export interface BoardColumnState {
  tickets: Dialog[];
  total: number;
  endCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export type BoardColumnsState = Record<BoardStatus, BoardColumnState>;

const EMPTY_COLUMN: BoardColumnState = {
  tickets: [],
  total: 0,
  endCursor: null,
  hasMore: false,
  isLoadingMore: false,
};

function emptyColumns(): BoardColumnsState {
  return {
    ACTIVE: { ...EMPTY_COLUMN },
    TECH_REQUIRED: { ...EMPTY_COLUMN },
    ON_HOLD: { ...EMPTY_COLUMN },
    RESOLVED: { ...EMPTY_COLUMN },
  };
}

function pageToColumn(page: TicketsBoardPage[BoardStatus]): BoardColumnState {
  return {
    tickets: page.dialogs,
    total: page.filteredCount,
    endCursor: page.pageInfo.endCursor ?? null,
    hasMore: !!page.pageInfo.hasNextPage,
    isLoadingMore: false,
  };
}

export interface UseTicketsBoardQueryParams {
  search?: string;
  organizationIds?: string[];
  assigneeIds?: string[];
}

export function useTicketsBoardQuery({ search, organizationIds, assigneeIds }: UseTicketsBoardQueryParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<TicketsBoardPage, Error>({
    queryKey: dialogsQueryKeys.board({ search, organizationIds, assigneeIds }),
    queryFn: () =>
      ticketService.fetchTicketsBoard({
        search: search || undefined,
        organizationIds: organizationIds?.length ? organizationIds : undefined,
        assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
        limit: BOARD_INITIAL_PAGE_SIZE,
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30_000,
  });

  const [columns, setColumns] = useState<BoardColumnsState>(emptyColumns);

  useEffect(() => {
    if (!query.data) return;
    setColumns({
      ACTIVE: pageToColumn(query.data.ACTIVE),
      TECH_REQUIRED: pageToColumn(query.data.TECH_REQUIRED),
      ON_HOLD: pageToColumn(query.data.ON_HOLD),
      RESOLVED: pageToColumn(query.data.RESOLVED),
    });
  }, [query.data]);

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Failed to Load Tickets',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  const loadMore = useCallback(
    async (columnId: string) => {
      const status = columnId as BoardStatus;
      if (!BOARD_STATUSES.includes(status)) return;

      const current = columns[status];
      if (!current.hasMore || current.isLoadingMore || !current.endCursor) return;

      setColumns(prev => ({ ...prev, [status]: { ...prev[status], isLoadingMore: true } }));

      try {
        const page = await ticketService.fetchDialogs({
          statuses: [status],
          search: search || undefined,
          organizationIds: organizationIds?.length ? organizationIds : undefined,
          assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
          cursor: current.endCursor,
          limit: BOARD_LOAD_MORE_PAGE_SIZE,
        });

        setColumns(prev => {
          const existingIds = new Set(prev[status].tickets.map(t => t.id));
          const newTickets = page.dialogs.filter(t => !existingIds.has(t.id));
          return {
            ...prev,
            [status]: {
              tickets: [...prev[status].tickets, ...newTickets],
              total: page.filteredCount,
              endCursor: page.pageInfo.endCursor ?? null,
              hasMore: !!page.pageInfo.hasNextPage,
              isLoadingMore: false,
            },
          };
        });
      } catch (err) {
        setColumns(prev => ({ ...prev, [status]: { ...prev[status], isLoadingMore: false } }));
        toast({
          title: 'Failed to Load More Tickets',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    [columns, search, organizationIds, assigneeIds, toast],
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: dialogsQueryKeys.board({ search, organizationIds, assigneeIds }),
    });
  }, [queryClient, search, organizationIds, assigneeIds]);

  return useMemo(
    () => ({
      columns,
      loadMore,
      refetch,
      isLoading: query.isLoading,
      error: query.error?.message ?? null,
    }),
    [columns, loadMore, refetch, query.isLoading, query.error],
  );
}
