import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { DEFAULT_DEVICES_LIST_STATUSES } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import type { ComplianceStatus, PolicyDeviceRow } from '../types/policy-device-row';
import { usePolicyResponseHosts } from './use-policy-response-hosts';

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

interface DevicesPage {
  devices: Device[];
  hasNextPage: boolean;
  endCursor: string | null;
}

async function fetchDevicesPage(cursor: string | null): Promise<DevicesPage> {
  const response = await apiClient.post<GraphQlResponse<DevicesResponseData>>('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: {
      filter: { statuses: DEFAULT_DEVICES_LIST_STATUSES },
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

/**
 * Fetch all Fleet-connected devices via paginated GraphQL queries.
 */
async function fetchAllDevices(): Promise<Device[]> {
  const allDevices: Device[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchDevicesPage(cursor);
    allDevices.push(...page.devices);
    hasMore = page.hasNextPage;
    cursor = page.endCursor;
  }

  return allDevices;
}

export function usePolicyDevicesTable(
  policyId: number | null,
  assignedHostIds?: Array<{ id: number; hostname: string }>,
) {
  const { hosts: failingHosts, isLoading: isLoadingFailing } = usePolicyResponseHosts(policyId, 'failing');
  const { hosts: passingHosts, isLoading: isLoadingPassing } = usePolicyResponseHosts(policyId, 'passing');

  const devicesQuery = useQuery({
    queryKey: ['policy-devices-table-devices'],
    queryFn: fetchAllDevices,
  });

  const rows: PolicyDeviceRow[] = useMemo(() => {
    if (!devicesQuery.data) return [];

    const statusMap = new Map<number, ComplianceStatus>();
    for (const host of failingHosts) statusMap.set(host.id, 'non-compliant');
    for (const host of passingHosts) {
      if (!statusMap.has(host.id)) statusMap.set(host.id, 'passing');
    }
    if (assignedHostIds) {
      for (const host of assignedHostIds) {
        if (!statusMap.has(host.id)) statusMap.set(host.id, 'pending');
      }
    }

    const deviceByFleetId = new Map<number, Device>();
    for (const device of devicesQuery.data) {
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

    const fleetHostMap = new Map<number, { hostname: string; display_name: string }>();
    for (const h of failingHosts) fleetHostMap.set(h.id, h);
    for (const h of passingHosts) {
      if (!fleetHostMap.has(h.id)) fleetHostMap.set(h.id, h);
    }
    if (assignedHostIds) {
      for (const h of assignedHostIds) {
        if (!fleetHostMap.has(h.id)) fleetHostMap.set(h.id, { hostname: h.hostname, display_name: h.hostname });
      }
    }

    const result: PolicyDeviceRow[] = [];
    for (const [fleetId, status] of statusMap) {
      const device = deviceByFleetId.get(fleetId);
      const host = fleetHostMap.get(fleetId);
      result.push({
        id: String(fleetId),
        hostname: device?.hostname || host?.hostname || `Host ${fleetId}`,
        displayName:
          device?.displayName || device?.hostname || host?.display_name || host?.hostname || `Host ${fleetId}`,
        deviceType: device?.type,
        organization: device?.organization,
        organizationImageUrl: device?.organizationImageUrl,
        osType: device?.osType,
        complianceStatus: status,
        machineId: device?.machineId,
        fleetHostId: fleetId,
      });
    }

    const statusOrder: Record<ComplianceStatus, number> = { 'non-compliant': 0, pending: 1, passing: 2 };
    result.sort((a, b) => {
      if (a.complianceStatus !== b.complianceStatus) {
        return statusOrder[a.complianceStatus] - statusOrder[b.complianceStatus];
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return result;
  }, [devicesQuery.data, failingHosts, passingHosts, assignedHostIds]);

  return {
    rows,
    isLoading: isLoadingFailing || isLoadingPassing || devicesQuery.isLoading,
    error: devicesQuery.error?.message ?? null,
  };
}
