'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../devices/queries/devices-queries';
import { Device, DevicesGraphQlNode, GraphQlResponse } from '../../devices/types/device.types';
import { createDeviceListItem } from '../../devices/utils/device-transform';
import { mapPlatformsToOsTypes } from '../utils/script-utils';
import { useScriptDetails } from './use-script-details';

// ============ Query Keys ============

export const runScriptDataQueryKeys = {
  devices: (scriptId: string) => ['run-script-devices', scriptId] as const,
};

// ============ API Functions ============

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
      pagination: { limit: 100, cursor: null },
      search: '',
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

// ============ Hook ============

interface UseRunScriptDataOptions {
  scriptId: string;
}

export function useRunScriptData({ scriptId }: UseRunScriptDataOptions) {
  const { scriptDetails, isLoading: isLoadingScript, error: scriptError } = useScriptDetails(scriptId);

  const devicesQuery = useQuery({
    queryKey: runScriptDataQueryKeys.devices(scriptId),
    queryFn: () => fetchDevicesForScript(scriptDetails!.supported_platforms || []),
    enabled: !!scriptDetails,
  });

  return {
    // Script
    scriptDetails,
    isLoadingScript,
    scriptError,

    // Devices
    devices: devicesQuery.data ?? [],
    isLoadingDevices: devicesQuery.isLoading,
    devicesError: devicesQuery.error?.message ?? null,
  };
}
