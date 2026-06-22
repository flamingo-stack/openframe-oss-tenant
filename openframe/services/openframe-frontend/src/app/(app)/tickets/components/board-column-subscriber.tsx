'use client';

import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BOARD_PAGE_SIZE, type BoardColumnState } from '../hooks/use-tickets-board-query';
import { ticketService } from '../services';
import type { TicketsPage } from '../services/ticket-service.types';
import { dialogsQueryKeys } from '../utils/query-keys';

export interface BoardColumnUpdate {
  state: BoardColumnState;
  isLoading: boolean;
  error: Error | null;
}

interface BoardColumnSubscriberProps {
  statusId: string;
  params: { search?: string; organizationIds?: string[]; assigneeIds?: string[]; labelIds?: string[] };
  onUpdate: (statusId: string, update: BoardColumnUpdate) => void;
  registerLoadMore: (statusId: string, loadMore: () => void) => void;
}

/**
 * Owns one column's infinite query so the board can host a dynamic number of
 * columns (rules of hooks forbid a variable hook count in a single component).
 * Pages accumulate in the react-query cache under boardColumn(statusId),
 * which is exactly what applyOptimisticMove mutates. Renders nothing.
 */
export function BoardColumnSubscriber({ statusId, params, onUpdate, registerLoadMore }: BoardColumnSubscriberProps) {
  const { search, organizationIds, assigneeIds, labelIds } = params;

  const query = useInfiniteQuery<
    TicketsPage,
    Error,
    InfiniteData<TicketsPage, string | undefined>,
    ReturnType<typeof dialogsQueryKeys.boardColumn>,
    string | undefined
  >({
    queryKey: dialogsQueryKeys.boardColumn(statusId, { search, organizationIds, assigneeIds, labelIds }),
    queryFn: ({ pageParam }) =>
      ticketService.fetchBoardColumnByStatusId({
        statusId,
        search: search || undefined,
        organizationIds: organizationIds?.length ? organizationIds : undefined,
        assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
        labelIds: labelIds?.length ? labelIds : undefined,
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
    refetchInterval: 15_000,
  });

  const { data, isFetchingNextPage, isLoading, error, hasNextPage, fetchNextPage } = query;

  useEffect(() => {
    const pages = data?.pages ?? [];
    const lastPage = pages[pages.length - 1];
    onUpdate(statusId, {
      state: {
        tickets: pages.flatMap(p => p.dialogs),
        total: lastPage?.filteredCount ?? 0,
        endCursor: lastPage?.pageInfo.endCursor ?? null,
        hasMore: !!lastPage?.pageInfo.hasNextPage,
        isLoadingMore: isFetchingNextPage,
      },
      isLoading,
      error: error ?? null,
    });
  }, [statusId, data, isFetchingNextPage, isLoading, error, onUpdate]);

  useEffect(() => {
    registerLoadMore(statusId, () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
  }, [statusId, hasNextPage, isFetchingNextPage, fetchNextPage, registerLoadMore]);

  return null;
}
