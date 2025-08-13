import { ref } from 'vue';
import { computed, watch } from '@vue/runtime-core';
import { useQuery } from '@vue/apollo-composable';
import { GET_DEVICE_FILTERS } from '../graphql/queries';
import type { DeviceFilters, DeviceFilterInput } from '../types/graphql';

export function useDeviceFilters(filter: DeviceFilterInput | null = null) {
  const deviceFilters = ref<DeviceFilters | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const { result, loading: queryLoading, error: queryError, refetch } = useQuery(
    GET_DEVICE_FILTERS,
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
    if (newResult?.deviceFilters) {
      deviceFilters.value = newResult.deviceFilters;
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
  const statuses = computed(() => deviceFilters.value?.statuses || []);
  const deviceTypes = computed(() => deviceFilters.value?.deviceTypes || []);
  const osTypes = computed(() => deviceFilters.value?.osTypes || []);
  const organizationIds = computed(() => deviceFilters.value?.organizationIds || []);
  const tags = computed(() => deviceFilters.value?.tags || []);
  const filteredCount = computed(() => deviceFilters.value?.filteredCount || 0);

  // Update filter function
  const updateFilter = async (newFilter: DeviceFilterInput | null) => {
    try {
      await refetch({
        filter: newFilter || {}
      });
    } catch (err) {
      error.value = err as Error;
    }
  };

  return {
    deviceFilters,
    statuses,
    deviceTypes,
    osTypes,
    organizationIds,
    tags,
    filteredCount,
    loading,
    error,
    updateFilter
  };
} 