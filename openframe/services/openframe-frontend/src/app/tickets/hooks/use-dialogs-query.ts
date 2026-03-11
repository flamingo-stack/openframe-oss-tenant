'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { GET_DIALOGS_QUERY } from '../queries/dialogs-queries';
import type { CursorPageInfo, Dialog, DialogConnection } from '../types/dialog.types';
import { type DialogsQueryParams, dialogsQueryKeys } from '../utils/query-keys';

const DIALOGS_PAGE_SIZE = 20;

interface DialogsResponse {
  dialogs: DialogConnection;
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

interface DialogsPage {
  dialogs: Dialog[];
  pageInfo: CursorPageInfo;
}

export function useDialogsQuery({ archived, search, statusFilters }: DialogsQueryParams) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<DialogsPage, Error>({
    queryKey: dialogsQueryKeys.list({ archived, search, statusFilters }),
    queryFn: async ({ pageParam }) => {
      let statuses: string[];
      if (statusFilters && statusFilters.length > 0) {
        statuses = statusFilters;
      } else if (archived) {
        statuses = ['ARCHIVED'];
      } else {
        statuses = ['ACTIVE', 'ACTION_REQUIRED', 'ON_HOLD', 'RESOLVED'];
      }

      const paginationVars: Record<string, unknown> = { limit: DIALOGS_PAGE_SIZE };
      if (pageParam) {
        paginationVars.cursor = pageParam;
      }

      const response = await apiClient.post<GraphQlResponse<DialogsResponse>>('/chat/graphql', {
        query: GET_DIALOGS_QUERY,
        variables: {
          filter: { statuses, agentTypes: ['CLIENT'] },
          pagination: paginationVars,
          search: search || undefined,
        },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const graphqlResponse = response.data;

      if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred');
      }

      if (!graphqlResponse?.data) {
        throw new Error('No data received from server');
      }

      const connection = graphqlResponse.data.dialogs;
      const dialogs = (connection?.edges || []).map(edge => edge.node);
      const pageInfo = connection?.pageInfo || {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      };

      return { dialogs, pageInfo };
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
        title: 'Failed to Load Chats',
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
