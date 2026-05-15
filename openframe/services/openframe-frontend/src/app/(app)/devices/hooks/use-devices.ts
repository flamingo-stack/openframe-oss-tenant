'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { DEFAULT_DEVICES_LIST_STATUSES } from '../constants/device-statuses';
import { GET_DEVICES_QUERY } from '../queries/devices-queries';
import type { Device, DeviceFilterInput, DevicesGraphQlNode, GraphQlResponse } from '../types/device.types';
import { createDeviceListItem } from '../utils/device-transform';

const DEVICES_PAGE_SIZE = 20;

interface DevicesPage {
  devices: Device[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  filteredCount: number;
}

export const devicesQueryKeys = {
  all: ['devices'] as const,
  list: (filters: DeviceFilterInput, search: string) => ['devices', 'list', filters, search] as const,
};

export function useDevices(filters: DeviceFilterInput = {}, search = '') {
  const { toast } = useToast();

  // Apply default visible statuses when caller doesn't specify any. Keeps
  // PENDING/DELETED hidden across every screen unless an explicit override
  // is passed (e.g. archived devices view sets statuses: [ARCHIVED]).
  const effectiveFilters = useMemo<DeviceFilterInput>(
    () =>
      filters.statuses && filters.statuses.length > 0
        ? filters
        : { ...filters, statuses: [...DEFAULT_DEVICES_LIST_STATUSES] },
    [filters],
  );

  const query = useInfiniteQuery<DevicesPage, Error>({
    queryKey: devicesQueryKeys.list(effectiveFilters, search),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.post<
        GraphQlResponse<{
          devices: {
            edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
            pageInfo: {
              hasNextPage: boolean;
              hasPreviousPage: boolean;
              startCursor?: string;
              endCursor?: string;
            };
            filteredCount: number;
          };
        }>
      >('/api/graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter: effectiveFilters,
          first: DEVICES_PAGE_SIZE,
          after: (pageParam as string) || null,
          search: search || '',
          sort: { field: 'status', direction: 'DESC' },
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

      const nodes = graphqlResponse.data.devices.edges.map(e => e.node);
      const devices = nodes.map(createDeviceListItem);

      return {
        devices,
        pageInfo: graphqlResponse.data.devices.pageInfo,
        filteredCount: graphqlResponse.data.devices.filteredCount,
      };
    },
    getNextPageParam: lastPage => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined as string | undefined,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Failed to Load Devices',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  const devices = useMemo(() => query.data?.pages.flatMap(page => page.devices) ?? [], [query.data?.pages]);

  return {
    devices,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    filteredCount: query.data?.pages[0]?.filteredCount ?? 0,
    refetch: query.refetch,
  };
}
