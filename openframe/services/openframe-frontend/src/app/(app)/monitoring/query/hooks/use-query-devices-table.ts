import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { DEVICE_ENRICHMENT_STATUSES } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import type { QueryDeviceRow } from '../types/query-device-row';

const DEVICES_PAGE_SIZE = 100;

interface DevicesResponseData {
  devices: {
    edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor?: string };
  };
}

async function fetchDevicesPage(
  cursor: string | null,
): Promise<{ devices: Device[]; hasNextPage: boolean; endCursor: string | null }> {
  const response = await apiClient.post<GraphQlResponse<DevicesResponseData>>('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: {
      filter: { statuses: DEVICE_ENRICHMENT_STATUSES },
      first: DEVICES_PAGE_SIZE,
      after: cursor,
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

  const nodes = graphqlResponse.data.devices.edges.map((e: { node: DevicesGraphQlNode }) => e.node);
  return {
    devices: nodes.map(createDeviceListItem),
    hasNextPage: graphqlResponse.data.devices.pageInfo.hasNextPage,
    endCursor: graphqlResponse.data.devices.pageInfo.endCursor ?? null,
  };
}

/** Fetch all Fleet-connected devices via paginated GraphQL queries. */
async function fetchAllDevices(): Promise<Device[]> {
  const allDevices: Device[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  while (hasMore) {
    const page = await fetchDevicesPage(cursor);
    allDevices.push(...page.devices);
    // Stop if the cursor can't advance, even when the API still reports a next
    // page — otherwise a null `endCursor` would refetch page one indefinitely.
    hasMore = page.hasNextPage && page.endCursor !== null;
    cursor = page.endCursor;
  }
  return allDevices;
}

const QUERY_HOSTS_PAGE_SIZE = 100;

/** Fetch all hosts assigned to a query, following Fleet's page-based pagination. */
async function fetchQueryHosts(queryId: number): Promise<Array<{ id: number; hostname: string }>> {
  const allHosts: Array<{ id: number; hostname: string }> = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const res = await fleetApiClient.getQueryHosts(queryId, { page, per_page: QUERY_HOSTS_PAGE_SIZE });
    if (!res.ok) {
      throw new Error(res.error || `Failed to load assigned devices (${res.status})`);
    }
    const hosts = res.data?.hosts ?? [];
    allHosts.push(...hosts);
    // Guard against an infinite loop if the API reports more pages but returns none.
    hasMore = (res.data?.meta?.has_next_results ?? false) && hosts.length > 0;
    page += 1;
  }
  return allHosts;
}

/**
 * Builds the rows for the Query "Assigned Devices" table by merging the query's
 * assigned Fleet hosts with the device registry (deduplicated by Fleet host id,
 * preferring the most recently seen device). Sorted by display name.
 */
export function useQueryDevicesTable(queryId: number | null) {
  // The Fleet hosts assigned to this query (id + hostname only).
  const hostsQuery = useQuery({
    queryKey: ['query-assigned-hosts', queryId],
    queryFn: () => fetchQueryHosts(queryId!),
    enabled: queryId !== null,
  });

  // The full device registry, used to enrich each assigned host with display,
  // organization, OS, status and tag data.
  const devicesQuery = useQuery({
    queryKey: ['query-devices-table-devices'],
    queryFn: fetchAllDevices,
    enabled: queryId !== null,
  });

  const rows = useMemo<QueryDeviceRow[]>(() => {
    const hosts = hostsQuery.data;
    if (!hosts) return [];

    // Lookup from Fleet host id to its device, deduplicated by keeping the most
    // recently seen device when several map to the same Fleet host id.
    const deviceByFleetId = new Map<number, Device>();
    for (const device of devicesQuery.data ?? []) {
      const fleetId = getFleetHostId(device);
      if (fleetId === undefined) continue;
      const existing = deviceByFleetId.get(fleetId);
      if (
        !existing ||
        new Date(device.lastSeen || device.last_seen || 0) > new Date(existing.lastSeen || existing.last_seen || 0)
      ) {
        deviceByFleetId.set(fleetId, device);
      }
    }

    // Merge each assigned host with its device data (falling back to the host's
    // own fields when no matching device exists in the registry).
    const result: QueryDeviceRow[] = hosts.map(host => {
      const device = deviceByFleetId.get(host.id);
      return {
        id: String(host.id),
        hostname: device?.hostname || host.hostname || `Host ${host.id}`,
        displayName: device?.displayName || device?.hostname || host.hostname || `Host ${host.id}`,
        deviceType: device?.type,
        organization: device?.organization,
        organizationImageUrl: device?.organizationImageUrl,
        organizationImageHash: device?.organizationImageHash,
        osType: device?.osType,
        status: device?.status || 'UNKNOWN',
        lastSeen: device?.lastSeen || device?.last_seen,
        machineId: device?.machineId,
        fleetHostId: host.id,
        tags: (device?.tags ?? []).flatMap(tag => tag.values.map(value => ({ key: tag.key, value }))),
      };
    });

    result.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return result;
  }, [hostsQuery.data, devicesQuery.data]);

  return {
    rows,
    isLoading: hostsQuery.isLoading || devicesQuery.isLoading,
    error: hostsQuery.error?.message ?? devicesQuery.error?.message ?? null,
  };
}
