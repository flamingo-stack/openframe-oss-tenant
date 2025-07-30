import { ref } from 'vue';
import { watch } from '@vue/runtime-core';
import { useQuery } from '@vue/apollo-composable';
import { GET_LOGS } from '../graphql/queries';
import type { LogEvent, LogFilterInput, LogConnection } from '../types/graphql';

export interface LogFilter {
  search?: string;
  startDate?: string;
  endDate?: string;
  eventType?: string;
  toolType?: string;
  severity?: string;
  userId?: string;
  deviceId?: string;
}

export function useLogs() {
  const logs = ref<LogEvent[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);
  const filter = ref<LogFilterInput>({});
  const limit = ref(20);
  const cursor = ref<string | null>(null);
  const search = ref<string>('');
  const hasNextPage = ref(false);
  const hasPreviousPage = ref(false);
  const startCursor = ref<string | null>(null);
  const endCursor = ref<string | null>(null);
  const isInitialLoad = ref(true);

  const { result, loading: queryLoading, error: queryError, refetch: queryRefetch } = useQuery(
    GET_LOGS,
    () => ({
      filter: filter.value,
      pagination: {
        limit: limit.value,
        cursor: cursor.value
      },
      search: search.value
    }),
    () => ({
      enabled: true,
      fetchPolicy: 'cache-and-network'
    })
  );

  watch(result, (newResult) => {
    if (newResult?.logs) {
      const connection: LogConnection = newResult.logs;
      
      // Only replace logs on initial load or filter/search changes
      if (isInitialLoad.value) {
        logs.value = connection.edges.map(edge => edge.node);
        isInitialLoad.value = false;
      }
      // For infinite scroll, we don't update logs here - manual management handles it
      
      hasNextPage.value = connection.pageInfo.hasNextPage;
      hasPreviousPage.value = connection.pageInfo.hasPreviousPage;
      startCursor.value = connection.pageInfo.startCursor || null;
      endCursor.value = connection.pageInfo.endCursor || null;
    }
  });

  watch(queryLoading, (newLoading) => {
    loading.value = newLoading;
  });

  watch(queryError, (newError) => {
    error.value = newError;
  });

  const refetch = async (
    newFilter?: LogFilterInput,
    newLimit?: number,
    newCursor?: string | null,
    newSearch?: string
  ) => {
    let hasChanges = false;
    
    if (newFilter !== undefined && JSON.stringify(newFilter) !== JSON.stringify(filter.value)) {
      filter.value = newFilter;
      hasChanges = true;
      isInitialLoad.value = true; // Reset for new filter
    }
    if (newLimit !== undefined && newLimit !== limit.value) {
      limit.value = newLimit;
      hasChanges = true;
    }
    if (newCursor !== undefined && newCursor !== cursor.value) {
      cursor.value = newCursor;
      hasChanges = true;
    }
    if (newSearch !== undefined && newSearch !== search.value) {
      search.value = newSearch;
      hasChanges = true;
      isInitialLoad.value = true; // Reset for new search
    }

    if (hasChanges) {
      try {
        await queryRefetch();
      } catch (err) {
        error.value = err as Error;
      }
    }
  };

  // Manual infinite scroll that doesn't use Apollo's cache updates
  const loadMore = async () => {
    if (hasNextPage.value && endCursor.value) {
      try {
        // Use a direct GraphQL query instead of fetchMore to avoid cache updates
        const { default: client } = await import('@/apollo/apolloClient');
        const result = await client.query({
          query: GET_LOGS,
          variables: {
            filter: filter.value,
            pagination: {
              limit: limit.value,
              cursor: endCursor.value
            },
            search: search.value
          },
          fetchPolicy: 'network-only' // Don't use cache
        });
        
        if (result?.data?.logs) {
          const newLogs = result.data.logs.edges.map((edge: any) => edge.node);
          
          // Manually append logs to the array without triggering full re-render
          for (const log of newLogs) {
            logs.value.push(log);
          }
          
          // Update pagination info manually
          hasNextPage.value = result.data.logs.pageInfo.hasNextPage;
          hasPreviousPage.value = result.data.logs.pageInfo.hasPreviousPage;
          startCursor.value = result.data.logs.pageInfo.startCursor || null;
          endCursor.value = result.data.logs.pageInfo.endCursor || null;
        }
      } catch (err) {
        error.value = err as Error;
      }
    }
  };

  const loadPrevious = async () => {
    if (hasPreviousPage.value && startCursor.value) {
      try {
        // Use a direct GraphQL query instead of fetchMore
        const { default: client } = await import('@/apollo/apolloClient');
        const result = await client.query({
          query: GET_LOGS,
          variables: {
            filter: filter.value,
            pagination: {
              limit: limit.value,
              cursor: startCursor.value
            },
            search: search.value
          },
          fetchPolicy: 'network-only'
        });
        
        if (result?.data?.logs) {
          const newLogs = result.data.logs.edges.map((edge: any) => edge.node);
          
          // Prepend logs to the beginning
          logs.value.unshift(...newLogs);
          
          // Update pagination info manually
          hasNextPage.value = result.data.logs.pageInfo.hasNextPage;
          hasPreviousPage.value = result.data.logs.pageInfo.hasPreviousPage;
          startCursor.value = result.data.logs.pageInfo.startCursor || null;
          endCursor.value = result.data.logs.pageInfo.endCursor || null;
        }
      } catch (err) {
        error.value = err as Error;
      }
    }
  };

  // Legacy pagination methods (for backward compatibility)
  const loadNextPage = async () => {
    await loadMore();
  };

  const loadPreviousPage = async () => {
    await loadPrevious();
  };

  return {
    logs,
    loading,
    error,
    filter,
    limit,
    cursor,
    search,
    refetch,
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor,
    loadNextPage,
    loadPreviousPage,
    loadMore,
    loadPrevious
  };
} 