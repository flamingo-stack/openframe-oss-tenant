'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { GET_DEVICE_FILTERS_QUERY } from '../queries/devices-queries';
import type { DeviceFilterInput, DeviceFilters, GraphQlResponse } from '../types/device.types';

export const deviceFiltersQueryKeys = {
  all: ['deviceFilters'] as const,
  byFilter: (filters: DeviceFilterInput) => ['deviceFilters', filters] as const,
};

export function useDeviceFilters(filters: DeviceFilterInput = {}) {
  return useQuery<DeviceFilters | null>({
    queryKey: deviceFiltersQueryKeys.byFilter(filters),
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<{ deviceFilters: DeviceFilters }>>('/api/graphql', {
        query: GET_DEVICE_FILTERS_QUERY,
        variables: { filter: filters },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const graphqlResponse = response.data;
      if (!graphqlResponse?.data) return null;
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred');
      }

      return graphqlResponse.data.deviceFilters;
    },
    staleTime: 30 * 1000,
  });
}
