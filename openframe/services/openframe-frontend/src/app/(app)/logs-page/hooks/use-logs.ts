'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { GET_LOG_FILTERS_QUERY, GET_LOGS_QUERY } from '../queries/logs-queries';
import type { LogEdge, LogEntry, LogFilterInput, LogFilters } from '../types/log.types';

const LOGS_PAGE_SIZE = 20;

interface LogsPage {
  logs: LogEntry[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export const logsQueryKeys = {
  all: ['logs'] as const,
  list: (filters: LogFilterInput, search: string) => ['logs', 'list', filters, search] as const,
  filters: (filter: LogFilterInput) => ['logs', 'filters', filter] as const,
};

/**
 * Transform backend log data to include Device structure.
 * Maps flat fields (hostname, organizationName, organizationId) to partial Device object.
 */
function transformLogEntry(logEntry: LogEntry): LogEntry {
  if (logEntry.deviceId || logEntry.hostname || logEntry.organizationName) {
    return {
      ...logEntry,
      device: {
        id: logEntry.deviceId || '',
        machineId: logEntry.deviceId || '',
        hostname: logEntry.hostname || logEntry.deviceId || '',
        displayName: logEntry.hostname || '',
        organizationId: logEntry.organizationId,
        organization: logEntry.organizationName || logEntry.organizationId || '',
      },
    };
  }
  return logEntry;
}

export function useLogs(filters: LogFilterInput = {}, search = '') {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<LogsPage, Error>({
    queryKey: logsQueryKeys.list(filters, search),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.post<
        GraphQlResponse<{
          logs: {
            edges: LogEdge[];
            pageInfo: {
              hasNextPage: boolean;
              hasPreviousPage: boolean;
              startCursor?: string;
              endCursor?: string;
            };
          };
        }>
      >('/api/graphql', {
        query: GET_LOGS_QUERY,
        variables: {
          filter: filters,
          first: LOGS_PAGE_SIZE,
          after: (pageParam as string) || null,
          search: search || '',
        },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const graphqlResponse = response.data;
      if (!graphqlResponse?.data) {
        throw new Error('No data received from server');
      }
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred');
      }

      const logs = graphqlResponse.data.logs.edges.map(e => transformLogEntry(e.node));

      return {
        logs,
        pageInfo: graphqlResponse.data.logs.pageInfo,
      };
    },
    getNextPageParam: lastPage => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Error fetching logs',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  const logs = useMemo(() => query.data?.pages.flatMap(page => page.logs) ?? [], [query.data?.pages]);

  const resetToFirstPage = useCallback(() => {
    queryClient.resetQueries({ queryKey: logsQueryKeys.list(filters, search) });
  }, [queryClient, filters, search]);

  return {
    logs,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    resetToFirstPage,
  };
}

/**
 * Hook for fetching log filter options (severity, tool type, organization lists).
 */
export function useLogFilters(filter: LogFilterInput = {}) {
  const { toast } = useToast();

  const query = useQuery<LogFilters, Error>({
    queryKey: logsQueryKeys.filters(filter),
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<{ logFilters: LogFilters }>>('/api/graphql', {
        query: GET_LOG_FILTERS_QUERY,
        variables: { filter: filter || {} },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const graphqlResponse = response.data;
      if (!graphqlResponse?.data) {
        throw new Error('No data received from server');
      }
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred');
      }

      return graphqlResponse.data.logFilters;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Error fetching log filters',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  return {
    logFilters: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
