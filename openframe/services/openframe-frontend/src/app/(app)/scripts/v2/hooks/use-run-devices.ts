'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import { mapPlatformsToOsTypes } from '../../utils/script-utils';

export const runDevicesQueryKeys = {
  devices: (scriptId: string) => ['run-script-v2-devices', scriptId] as const,
};

async function fetchDevicesForScript(supportedPlatforms: string[]): Promise<Device[]> {
  const osTypes = mapPlatformsToOsTypes(supportedPlatforms);

  const filter = {
    statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
    ...(osTypes.length > 0 && { osTypes }),
  };

  const response = await apiClient.post<
    GraphQlResponse<{
      devices: {
        edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
        pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor?: string; endCursor?: string };
        filteredCount: number;
      };
    }>
  >('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: {
      filter,
      first: 100,
      search: '',
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
  return nodes.map(createDeviceListItem);
}

interface UseRunDevicesOptions {
  scriptId: string;
  supportedPlatforms: string[];
  enabled: boolean;
}

export function useRunDevices({ scriptId, supportedPlatforms, enabled }: UseRunDevicesOptions) {
  const query = useQuery({
    queryKey: runDevicesQueryKeys.devices(scriptId),
    queryFn: () => fetchDevicesForScript(supportedPlatforms),
    enabled,
  });

  return {
    devices: query.data ?? [],
    isLoadingDevices: query.isLoading,
    devicesError: query.error?.message ?? null,
  };
}
