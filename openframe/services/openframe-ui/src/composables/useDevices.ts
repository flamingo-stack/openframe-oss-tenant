import { ref } from 'vue';
import { watch } from '@vue/runtime-core';
import { useQuery } from '@vue/apollo-composable';
import { GET_DEVICES } from '../graphql/queries';
import type { Machine, DeviceFilterInput, PaginationInput, DeviceConnection, DeviceType, DeviceStatus } from '../types/graphql';

export interface DeviceFilter {
  search?: string;
  statuses?: DeviceStatus[];
  deviceTypes?: DeviceType[];
  osTypes?: string[];
  organizationIds?: string[];
  tagNames?: string[];
}

export function useDevices() {
  const devices = ref<Machine[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);
  const filter = ref<DeviceFilterInput>({});
  const pagination = ref<PaginationInput>({ page: 1, pageSize: 20 });
  const search = ref<string>('');
  const filteredCount = ref(0);
  const hasNextPage = ref(false);
  const hasPreviousPage = ref(false);
  const currentPage = ref(1);
  const totalPages = ref(1);

  const { result, loading: queryLoading, error: queryError, refetch: queryRefetch } = useQuery(
    GET_DEVICES,
    () => ({
      filter: filter.value,
      pagination: pagination.value,
      search: search.value
    }),
    () => ({
      enabled: true,
      fetchPolicy: 'cache-and-network'
    })
  );

  watch(result, (newResult) => {
    if (newResult?.devices) {
      const connection: DeviceConnection = newResult.devices;
      devices.value = connection.edges.map(edge => edge.node);
      filteredCount.value = connection.filteredCount;
      hasNextPage.value = connection.pageInfo.hasNextPage;
      hasPreviousPage.value = connection.pageInfo.hasPreviousPage;
      currentPage.value = connection.pageInfo.currentPage;
      totalPages.value = connection.pageInfo.totalPages;
    }
  });

  watch(queryLoading, (newLoading) => {
    loading.value = newLoading;
  });

  watch(queryError, (newError) => {
    error.value = newError;
  });

  const refetch = async (
    newFilter?: DeviceFilterInput,
    newPagination?: PaginationInput,
    newSearch?: string
  ) => {
    let hasChanges = false;
    
    if (newFilter !== undefined && JSON.stringify(newFilter) !== JSON.stringify(filter.value)) {
        filter.value = newFilter;
      hasChanges = true;
      }
    if (newPagination !== undefined && JSON.stringify(newPagination) !== JSON.stringify(pagination.value)) {
        pagination.value = newPagination;
      hasChanges = true;
      }
    if (newSearch !== undefined && newSearch !== search.value) {
        search.value = newSearch;
      hasChanges = true;
    }

    if (hasChanges) {
      try {
        await queryRefetch();
      } catch (err) {
        error.value = err as Error;
      }
    }
  };

  return {
    devices,
    loading,
    error,
    filter,
    pagination,
    search,
    refetch,
    filteredCount,
    hasNextPage,
    hasPreviousPage,
    currentPage,
    totalPages
  };
} 