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

export function usePolicyDevicesTable(policyId: number | null) {
  const { hosts: failingHosts, isLoading: isLoadingFailing } = usePolicyResponseHosts(policyId, 'failing');
  const { hosts: passingHosts, isLoading: isLoadingPassing } = usePolicyResponseHosts(policyId, 'passing');

  const devicesQuery = useQuery({
    queryKey: ['policy-devices-table-devices'],
    queryFn: fetchAllDevices,
  });

  const rows: PolicyDeviceRow[] = useMemo(() => {
    if (!devicesQuery.data) return [];

    const fleetDevices = devicesQuery.data.filter(d => getFleetHostId(d) !== undefined);
    const deduplicated = deduplicateByFleetId(fleetDevices);

    const deviceByFleetId = new Map<number, Device>();
    for (const device of deduplicated) {
      const fleetId = getFleetHostId(device);
      if (fleetId !== undefined) {
        deviceByFleetId.set(fleetId, device);
      }
    }

    const processedIds = new Set<number>();

    function buildRow(
      fleetHostId: number,
      hostname: string,
      displayName: string,
      status: ComplianceStatus,
    ): PolicyDeviceRow {
      const device = deviceByFleetId.get(fleetHostId);
      return {
        id: String(fleetHostId),
        hostname,
        displayName: device?.displayName || device?.hostname || displayName || hostname,
        deviceType: device?.type,
        organization: device?.organization,
        organizationImageUrl: device?.organizationImageUrl,
        osType: device?.osType,
        complianceStatus: status,
        machineId: device?.machineId,
        fleetHostId,
      };
    }

    const result: PolicyDeviceRow[] = [];

    for (const host of failingHosts) {
      if (processedIds.has(host.id)) continue;
      processedIds.add(host.id);
      result.push(buildRow(host.id, host.hostname, host.display_name, 'non-compliant'));
    }

    for (const host of passingHosts) {
      if (processedIds.has(host.id)) continue;
      processedIds.add(host.id);
      result.push(buildRow(host.id, host.hostname, host.display_name, 'passing'));
    }

    result.sort((a, b) => {
      if (a.complianceStatus !== b.complianceStatus) {
        return a.complianceStatus === 'non-compliant' ? -1 : 1;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return result;
  }, [devicesQuery.data, failingHosts, passingHosts]);

  return {
    rows,
    isLoading: isLoadingFailing || isLoadingPassing || devicesQuery.isLoading,
    error: devicesQuery.error?.message ?? null,
  };
}
