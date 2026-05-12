'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ticketService } from '../services';
import type { BoardStatus, TicketsBoardPage, TicketsPage } from '../services/ticket-service.types';
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

function pageToColumn(page: TicketsPage, isLoadingMore: boolean): BoardColumnState {
  return {
    tickets: page.dialogs,
    total: page.filteredCount,
    endCursor: page.pageInfo.endCursor ?? null,
    hasMore: !!page.pageInfo.hasNextPage,
    isLoadingMore,
  };
}

const EMPTY_LOADING_MORE: Record<BoardStatus, boolean> = {
  ACTIVE: false,
  TECH_REQUIRED: false,
  ON_HOLD: false,
  RESOLVED: false,
};

export interface UseTicketsBoardQueryParams {
  search?: string;
  organizationIds?: string[];
  assigneeIds?: string[];
}

export function useTicketsBoardQuery({ search, organizationIds, assigneeIds }: UseTicketsBoardQueryParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => dialogsQueryKeys.board({ search, organizationIds, assigneeIds }),
    [search, organizationIds, assigneeIds],
  );

  const query = useQuery<TicketsBoardPage, Error>({
    queryKey,
    queryFn: () => {
      const cached = queryClient.getQueryData<TicketsBoardPage>(queryKey);
      const limit = cached
        ? Math.max(BOARD_INITIAL_PAGE_SIZE, ...BOARD_STATUSES.map(s => cached[s].dialogs.length))
        : BOARD_INITIAL_PAGE_SIZE;
      return ticketService.fetchTicketsBoard({
        search: search || undefined,
        organizationIds: organizationIds?.length ? organizationIds : undefined,
        assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
        limit,
      });
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30_000,
  });

  const [loadingMore, setLoadingMore] = useState<Record<BoardStatus, boolean>>(EMPTY_LOADING_MORE);

  const columns = useMemo<BoardColumnsState>(() => {
    if (!query.data) return emptyColumns();
    return {
      ACTIVE: pageToColumn(query.data.ACTIVE, loadingMore.ACTIVE),
      TECH_REQUIRED: pageToColumn(query.data.TECH_REQUIRED, loadingMore.TECH_REQUIRED),
      ON_HOLD: pageToColumn(query.data.ON_HOLD, loadingMore.ON_HOLD),
      RESOLVED: pageToColumn(query.data.RESOLVED, loadingMore.RESOLVED),
    };
  }, [query.data, loadingMore]);

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

      const current = query.data?.[status];
      if (!current?.pageInfo.hasNextPage || !current.pageInfo.endCursor || loadingMore[status]) return;

      setLoadingMore(prev => ({ ...prev, [status]: true }));

      try {
        const page = await ticketService.fetchDialogs({
          statuses: [status],
          search: search || undefined,
          organizationIds: organizationIds?.length ? organizationIds : undefined,
          assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
          cursor: current.pageInfo.endCursor,
          limit: BOARD_LOAD_MORE_PAGE_SIZE,
        });

        queryClient.setQueryData<TicketsBoardPage>(queryKey, prev => {
          if (!prev) return prev;
          const existingIds = new Set(prev[status].dialogs.map(t => t.id));
          const newDialogs = page.dialogs.filter(t => !existingIds.has(t.id));
          return {
            ...prev,
            [status]: {
              dialogs: [...prev[status].dialogs, ...newDialogs],
              filteredCount: page.filteredCount,
              pageInfo: page.pageInfo,
            },
          };
        });
      } catch (err) {
        toast({
          title: 'Failed to Load More Tickets',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setLoadingMore(prev => ({ ...prev, [status]: false }));
      }
    },
    [query.data, loadingMore, search, organizationIds, assigneeIds, queryClient, queryKey, toast],
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

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
