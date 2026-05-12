'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { ticketService } from '../services';
import type { BoardStatus, TicketsPage } from '../services/ticket-service.types';
import type { Dialog } from '../types/dialog.types';
import { dialogsQueryKeys } from '../utils/query-keys';

export const BOARD_PAGE_SIZE = 20;

export const BOARD_STATUSES: readonly BoardStatus[] = ['ACTIVE', 'TECH_REQUIRED', 'ON_HOLD', 'RESOLVED'] as const;

export interface BoardColumnState {
  tickets: Dialog[];
  total: number;
  endCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export type BoardColumnsState = Record<BoardStatus, BoardColumnState>;

export interface UseTicketsBoardQueryParams {
  search?: string;
  organizationIds?: string[];
  assigneeIds?: string[];
}

type BoardColumnQuery = ReturnType<typeof useBoardColumnQuery>;

function useBoardColumnQuery(status: BoardStatus, params: UseTicketsBoardQueryParams) {
  const { search, organizationIds, assigneeIds } = params;
  return useInfiniteQuery<
    TicketsPage,
    Error,
    InfiniteData<TicketsPage, string | undefined>,
    ReturnType<typeof dialogsQueryKeys.boardColumn>,
    string | undefined
  >({
    queryKey: dialogsQueryKeys.boardColumn(status, { search, organizationIds, assigneeIds }),
    queryFn: ({ pageParam }) =>
      ticketService.fetchDialogs({
        statuses: [status],
        search: search || undefined,
        organizationIds: organizationIds?.length ? organizationIds : undefined,
        assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
        cursor: pageParam,
        limit: BOARD_PAGE_SIZE,
      }),
    initialPageParam: undefined,
    getNextPageParam: lastPage =>
      lastPage.pageInfo.hasNextPage ? (lastPage.pageInfo.endCursor ?? undefined) : undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30_000,
  });
}

function toColumnState(query: BoardColumnQuery): BoardColumnState {
  const pages = query.data?.pages ?? [];
  const tickets = pages.flatMap(p => p.dialogs);
  const lastPage = pages[pages.length - 1];
  return {
    tickets,
    total: lastPage?.filteredCount ?? 0,
    endCursor: lastPage?.pageInfo.endCursor ?? null,
    hasMore: !!lastPage?.pageInfo.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
}

export function useTicketsBoardQuery(params: UseTicketsBoardQueryParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const active = useBoardColumnQuery('ACTIVE', params);
  const techRequired = useBoardColumnQuery('TECH_REQUIRED', params);
  const onHold = useBoardColumnQuery('ON_HOLD', params);
  const resolved = useBoardColumnQuery('RESOLVED', params);

  const queryByStatus = useMemo<Record<BoardStatus, BoardColumnQuery>>(
    () => ({
      ACTIVE: active,
      TECH_REQUIRED: techRequired,
      ON_HOLD: onHold,
      RESOLVED: resolved,
    }),
    [active, techRequired, onHold, resolved],
  );

  const columns = useMemo<BoardColumnsState>(
    () => ({
      ACTIVE: toColumnState(active),
      TECH_REQUIRED: toColumnState(techRequired),
      ON_HOLD: toColumnState(onHold),
      RESOLVED: toColumnState(resolved),
    }),
    [active, techRequired, onHold, resolved],
  );

  const firstError = active.error ?? techRequired.error ?? onHold.error ?? resolved.error ?? null;

  useEffect(() => {
    if (firstError) {
      toast({
        title: 'Failed to Load Tickets',
        description: firstError.message,
        variant: 'destructive',
      });
    }
  }, [firstError, toast]);

  const loadMore = useCallback(
    (columnId: string) => {
      const status = columnId as BoardStatus;
      if (!BOARD_STATUSES.includes(status)) return;
      const q = queryByStatus[status];
      if (!q.hasNextPage || q.isFetchingNextPage) return;
      q.fetchNextPage();
    },
    [queryByStatus],
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.boardColumns() });
  }, [queryClient]);

  const isLoading = active.isLoading || techRequired.isLoading || onHold.isLoading || resolved.isLoading;

  return useMemo(
    () => ({
      columns,
      loadMore,
      refetch,
      isLoading,
      error: firstError?.message ?? null,
    }),
    [columns, loadMore, refetch, isLoading, firstError],
  );
}
