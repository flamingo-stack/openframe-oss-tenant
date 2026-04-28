'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { getDialogService } from '../services';
import type { DialogsPage } from '../services/dialog-service.types';
import { type DialogsQueryParams, dialogsQueryKeys } from '../utils/query-keys';
import { useDialogVersion } from './use-dialog-version';

const DIALOGS_PAGE_SIZE = 20;

export function useDialogsQuery({ archived, search, statusFilters }: DialogsQueryParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const version = useDialogVersion();
  const service = getDialogService(version);

  const query = useInfiniteQuery<DialogsPage, Error>({
    queryKey: dialogsQueryKeys.list({ archived, search, statusFilters }),
    queryFn: async ({ pageParam }) => {
      let statuses: string[];
      if (statusFilters && statusFilters.length > 0) {
        statuses = statusFilters;
      } else if (archived) {
        statuses = ['ARCHIVED'];
      } else {
        const openStatus = version === 'v2' ? 'TECH_REQUIRED' : 'ACTION_REQUIRED';
        statuses = ['ACTIVE', openStatus, 'ON_HOLD', 'RESOLVED'];
      }

      return service.fetchDialogs({
        statuses,
        search: search || undefined,
        cursor: pageParam as string | undefined,
        limit: DIALOGS_PAGE_SIZE,
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
    queryClient.resetQueries({ queryKey: dialogsQueryKeys.list({ archived, search, statusFilters }) });
  }, [queryClient, archived, search, statusFilters]);

  return {
    dialogs,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    resetToFirstPage,
  };
}
