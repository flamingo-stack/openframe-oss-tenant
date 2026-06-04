'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { ticketService } from '../services';
import type { TicketsPage } from '../services/ticket-service.types';
import { useTicketStatusesQuery } from '../statuses/hooks/use-ticket-statuses-query';
import { type DialogsQueryParams, dialogsQueryKeys } from '../utils/query-keys';

const TICKETS_PAGE_SIZE = 20;

export function useTicketsQuery({ archived, search, statusFilters, organizationIds, assigneeIds }: DialogsQueryParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const lifecycleEnabled = featureFlags.ticketStatuses.enabled();
  const statusesQuery = useTicketStatusesQuery({ enabled: lifecycleEnabled && archived });
  const statusIds = useMemo(() => {
    if (!(lifecycleEnabled && archived)) return undefined;
    const archivedId = statusesQuery.data?.snapshot.find(s => s.kind === 'ARCHIVED')?.id;
    return archivedId ? [archivedId] : undefined;
  }, [lifecycleEnabled, archived, statusesQuery.data]);

  const waitingForStatusIds = lifecycleEnabled && archived && statusesQuery.isLoading;

  const query = useInfiniteQuery<TicketsPage, Error>({
    queryKey: dialogsQueryKeys.list({ archived, search, statusFilters, statusIds, organizationIds, assigneeIds }),
    enabled: !waitingForStatusIds,
    queryFn: async ({ pageParam }) => {
      let statuses: string[];
      if (statusFilters && statusFilters.length > 0) {
        statuses = statusFilters;
      } else if (archived) {
        statuses = ['ARCHIVED'];
      } else {
        statuses = ['ACTIVE', 'TECH_REQUIRED', 'ON_HOLD', 'RESOLVED'];
      }

      return ticketService.fetchDialogs({
        statuses,
        statusIds,
        search: search || undefined,
        organizationIds: organizationIds?.length ? organizationIds : undefined,
        assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
        cursor: pageParam as string | undefined,
        limit: TICKETS_PAGE_SIZE,
      });
    },
    getNextPageParam: lastPage => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Failed to Load Tickets',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  const dialogs = useMemo(() => query.data?.pages.flatMap(page => page.dialogs) ?? [], [query.data?.pages]);

  const resetToFirstPage = useCallback(() => {
    queryClient.resetQueries({
      queryKey: dialogsQueryKeys.list({ archived, search, statusFilters, statusIds, organizationIds, assigneeIds }),
    });
  }, [queryClient, archived, search, statusFilters, statusIds, organizationIds, assigneeIds]);

  return {
    dialogs,
    isLoading: query.isLoading || waitingForStatusIds,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    resetToFirstPage,
  };
}
