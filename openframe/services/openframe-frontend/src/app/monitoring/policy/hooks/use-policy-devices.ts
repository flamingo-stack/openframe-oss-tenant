import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import type { InfiniteScrollConfig } from '../../../components/shared/device-selector';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';

const DEVICES_PAGE_SIZE = 20;

interface DevicesPage {
  devices: Device[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

/**
 * Deduplicate devices by Fleet host ID, keeping the device with the most recent lastSeen.
 */
function deduplicateByFleetId(devices: Device[]): Device[] {
  const byFleetId = new Map<number, Device>();
  for (const device of devices) {
    const fleetId = getFleetHostId(device);
    if (fleetId === undefined) continue;

    const existing = byFleetId.get(fleetId);
    if (!existing) {
      byFleetId.set(fleetId, device);
    } else {
      const existingTime = new Date(existing.lastSeen || existing.last_seen || 0).getTime();
      const newTime = new Date(device.lastSeen || device.last_seen || 0).getTime();
      if (newTime > existingTime) {
        byFleetId.set(fleetId, device);
      }
    }
  }
  return Array.from(byFleetId.values());
}

export function usePolicyDevices() {
  const devicesQuery = useInfiniteQuery<DevicesPage, Error>({
    queryKey: ['policy-device-selector-devices'],
    queryFn: async ({ pageParam }) => {
      const filter = {
        statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
      };

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
          filter,
          first: DEVICES_PAGE_SIZE,
          after: (pageParam as string) || null,
          search: '',
        },
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch devices');
      }

      const graphqlResponse = response.data;
      if (!graphqlResponse?.data) {
        throw new Error('No data received from server');
      }

      const nodes = graphqlResponse.data.devices.edges.map(e => e.node);
      const devices = nodes.map(createDeviceListItem);

      return {
        devices,
        pageInfo: graphqlResponse.data.devices.pageInfo,
      };
    },
    getNextPageParam: lastPage => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined as string | undefined,
  });

  const flatDevices = useMemo(
    () => devicesQuery.data?.pages.flatMap(page => page.devices) ?? [],
    [devicesQuery.data?.pages],
  );

  // Filter to Fleet MDM devices and deduplicate by Fleet host ID
  const devices = useMemo(() => {
    const fleetDevices = flatDevices.filter(d => getFleetHostId(d) !== undefined);
    return deduplicateByFleetId(fleetDevices);
  }, [flatDevices]);

  const infiniteScroll: InfiniteScrollConfig | undefined = useMemo(
    () => ({
      hasNextPage: devicesQuery.hasNextPage ?? false,
      isFetchingNextPage: devicesQuery.isFetchingNextPage,
      onLoadMore: () => devicesQuery.fetchNextPage(),
      skeletonRows: 2,
    }),
    [devicesQuery.hasNextPage, devicesQuery.isFetchingNextPage, devicesQuery.fetchNextPage],
  );

  return {
    devices,
    isLoading: devicesQuery.isLoading,
    infiniteScroll,
  };
}
