'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { GET_DIALOGS_QUERY } from '../queries/dialogs-queries';
import { CursorPageInfo, Dialog, DialogConnection } from '../types/dialog.types';
import { type DialogsQueryParams, dialogsQueryKeys } from '../utils/query-keys';

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

export function useDialogsQuery({ archived, search, statusFilters, cursor }: DialogsQueryParams) {
  const query = useQuery({
    queryKey: dialogsQueryKeys.list({ archived, search, statusFilters, cursor }),

    queryFn: async (): Promise<{
      dialogs: Dialog[];
      pageInfo: CursorPageInfo;
    }> => {
      let statuses: string[];
      if (statusFilters && statusFilters.length > 0) {
        statuses = statusFilters;
      } else if (archived) {
        statuses = ['ARCHIVED'];
      } else {
        statuses = ['ACTIVE', 'ACTION_REQUIRED', 'ON_HOLD', 'RESOLVED'];
      }

      const paginationVars: any = { limit: 10 };
      if (cursor && cursor.trim() !== '') {
        paginationVars.cursor = cursor;
      }

      const response = await apiClient.post<GraphQlResponse<DialogsResponse>>('/chat/graphql', {
        query: GET_DIALOGS_QUERY,
        variables: {
          filter: { statuses, agentTypes: ['CLIENT'] },
          pagination: paginationVars,
          search: search || undefined,
          slaSort: 'ASC',
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

    // Query options
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  return {
    // Data
    dialogs: query.data?.dialogs || [],
    pageInfo: query.data?.pageInfo || null,

    // States
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || null,
    isFetching: query.isFetching,
    isStale: query.isStale,

    // Actions
    refetch: query.refetch,

    // Pagination helpers
    hasNextPage: query.data?.pageInfo?.hasNextPage || false,
    endCursor: query.data?.pageInfo?.endCursor || null,
    startCursor: query.data?.pageInfo?.startCursor || null,
  };
}
