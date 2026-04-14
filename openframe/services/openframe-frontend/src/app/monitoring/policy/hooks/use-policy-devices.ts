import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';

const DEVICES_PAGE_SIZE = 100;

interface DevicesResponseData {
  devices: {
    edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
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

async function fetchAllDevices(): Promise<Device[]> {
  const allDevices: Device[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const response: Awaited<ReturnType<typeof apiClient.post<GraphQlResponse<DevicesResponseData>>>> =
      await apiClient.post('/api/graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter: { statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE] },
          first: DEVICES_PAGE_SIZE,
          after: cursor,
          search: '',
          sort: { field: 'status', direction: 'DESC' },
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
    allDevices.push(...nodes.map(createDeviceListItem));
    hasMore = graphqlResponse.data.devices.pageInfo.hasNextPage;
    cursor = graphqlResponse.data.devices.pageInfo.endCursor ?? null;
  }

  return allDevices;
}

export function usePolicyDevices() {
  const devicesQuery = useQuery({
    queryKey: ['policy-device-selector-devices'],
    queryFn: fetchAllDevices,
  });

  const devices = useMemo(() => {
    const allDevices = devicesQuery.data ?? [];
    const fleetDevices: Device[] = [];
    const nonFleetDevices: Device[] = [];
    for (const d of allDevices) {
      if (getFleetHostId(d) !== undefined) {
        fleetDevices.push(d);
      } else {
        nonFleetDevices.push(d);
      }
    }
    return [...deduplicateByFleetId(fleetDevices), ...nonFleetDevices];
  }, [devicesQuery.data]);

  return {
    devices,
    isLoading: devicesQuery.isLoading,
  };
}
