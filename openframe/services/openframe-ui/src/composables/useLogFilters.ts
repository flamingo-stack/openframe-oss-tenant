import { ref } from 'vue';
import { computed, watch } from '@vue/runtime-core';
import { useQuery } from '@vue/apollo-composable';
import { GET_LOG_FILTERS } from '../graphql/queries';
import type { LogFilters, LogFilterInput } from '../types/graphql';

export function useLogFilters(filter: LogFilterInput | null = null) {
  const logFilters = ref<LogFilters | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const { result, loading: queryLoading, error: queryError, refetch } = useQuery(
    GET_LOG_FILTERS,
    () => ({
      filter: filter || {}
    }),
    () => ({
      enabled: true,
      fetchPolicy: 'cache-and-network'
    })
  );

  // Watch for query results
  watch(result, (newResult) => {
    if (newResult?.logFilters) {
      logFilters.value = newResult.logFilters;
    }
  });

  // Watch for loading state
  watch(queryLoading, (newLoading) => {
    loading.value = newLoading;
  });

  // Watch for errors
  watch(queryError, (newError) => {
    error.value = newError;
  });

  // Computed properties for filter options
  const toolTypeOptions = computed(() => logFilters.value?.toolTypes || []);
  const eventTypeOptions = computed(() => logFilters.value?.eventTypes || []);
  const severityOptions = computed(() => {
    const options = logFilters.value?.severities || [];
    // Deduplicate severity options to prevent duplicates in the UI
    return [...new Set(options)];
  });

  // Update filter function
  const updateFilter = async (newFilter: LogFilterInput | null) => {
    try {
      await refetch({
        filter: newFilter || {}
      });
    } catch (err) {
      error.value = err as Error;
    }
  };

  return {
    logFilters,
    toolTypeOptions,
    eventTypeOptions,
    severityOptions,
    loading,
    error,
    updateFilter
  };
} 