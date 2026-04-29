'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';

const GET_DEVICE_COUNTS_QUERY = `#graphql
  query GetOrganizationDeviceCounts($filter: DeviceFilterInput) {
    deviceFilters(filter: $filter) {
      organizationIds {
        value
        count
      }
    }
  }
`;

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface DeviceFiltersResponse {
  deviceFilters: {
    organizationIds: Array<{ value: string; count: number }>;
  };
}

export const organizationDeviceCountsKeys = {
  all: ['organization-device-counts'] as const,
  list: (organizationIds: string[]) => ['organization-device-counts', 'list', [...organizationIds].sort()] as const,
};

export function useOrganizationDeviceCounts(organizationIds: string[]) {
  const stableIds = useMemo(() => [...organizationIds].sort(), [organizationIds]);

  const query = useQuery<Map<string, number>, Error>({
    queryKey: organizationDeviceCountsKeys.list(stableIds),
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<DeviceFiltersResponse>>('/api/graphql', {
        query: GET_DEVICE_COUNTS_QUERY,
        variables: { filter: { organizationIds: stableIds } },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const graphql = response.data;
      if (graphql?.errors && graphql.errors.length > 0) {
        throw new Error(graphql.errors[0].message || 'GraphQL error occurred');
      }

      const counts = new Map<string, number>();
      const entries = graphql?.data?.deviceFilters?.organizationIds ?? [];
      for (const entry of entries) {
        counts.set(entry.value, entry.count);
      }
      return counts;
    },
    staleTime: 30_000,
  });

  return {
    deviceCounts: query.data ?? new Map<string, number>(),
    isLoading: query.isLoading,
  };
}
