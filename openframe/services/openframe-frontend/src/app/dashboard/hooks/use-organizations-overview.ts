'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/app/auth/hooks/use-auth-session';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../devices/constants/device-statuses';
import type { GraphQlResponse } from '../../devices/types/device.types';
import { dashboardQueryKeys } from '../utils/query-keys';

type OrganizationNode = {
  id: string;
  organizationId: string;
  name: string;
  websiteUrl?: string;
  image?: {
    imageUrl?: string;
  };
};

type OrganizationsResponse = {
  organizations: {
    edges: Array<{ node: OrganizationNode }>;
    pageInfo: { hasNextPage: boolean; endCursor?: string };
    filteredCount: number;
  };
};

export interface OrganizationOverviewRow {
  id: string;
  organizationId: string;
  name: string;
  websiteUrl: string;
  imageUrl: string | null;
  total: number;
  active: number;
  inactive: number;
  activePct: number;
  inactivePct: number;
}

const GET_ORGANIZATIONS_QUERY = `
  query GetOrganizations($pagination: CursorPaginationInput) {
    organizations(pagination: $pagination) {
      filteredCount
      edges {
        node {
          id
          organizationId
          name
          websiteUrl
          image {
            imageUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const GET_DEVICE_FILTERS_QUERY = `
  query GetDeviceFilters($filter: DeviceFilterInput) {
    deviceFilters(filter: $filter) {
      statuses {
        value
        count
      }
      organizationIds {
        value
        count
      }
      filteredCount
    }
  }
`;

async function fetchOrganizationsOverview(_limit: number): Promise<{
  rows: OrganizationOverviewRow[];
  totalOrganizations: number;
}> {
  try {
    const orgsResponse = await apiClient.post<GraphQlResponse<OrganizationsResponse>>('/api/graphql', {
      query: GET_ORGANIZATIONS_QUERY,
    });

    if (!orgsResponse.ok) {
      console.warn('Organizations overview API failed:', orgsResponse.error || orgsResponse.status);
      return { rows: [], totalOrganizations: 0 };
    }

    const orgsData = orgsResponse.data?.data?.organizations;
    if (!orgsData) {
      console.warn('Invalid organizations overview response structure');
      return { rows: [], totalOrganizations: 0 };
    }

    const totalOrganizations = orgsData.filteredCount || 0;
    const organizations = orgsData.edges.map(edge => edge.node);

    if (organizations.length === 0) {
      return { rows: [], totalOrganizations };
    }

    const allOrgIds = organizations.map(org => org.organizationId);

    const deviceResponse = await apiClient.post<
      GraphQlResponse<{
        deviceFilters: {
          filteredCount: number;
          statuses?: Array<{ value: string; count: number }>;
          organizationIds?: Array<{ value: string; count: number }>;
        };
      }>
    >('/api/graphql', {
      query: GET_DEVICE_FILTERS_QUERY,
      variables: {
        filter: {
          organizationIds: allOrgIds,
          statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
        },
      },
    });

    const orgDeviceCounts = new Map<string, number>();
    if (deviceResponse.ok && deviceResponse.data?.data?.deviceFilters?.organizationIds) {
      for (const entry of deviceResponse.data.data.deviceFilters.organizationIds) {
        orgDeviceCounts.set(entry.value, entry.count);
      }
    }

    const [onlineResponse, offlineResponse] = await Promise.all([
      apiClient.post<
        GraphQlResponse<{
          deviceFilters: { organizationIds?: Array<{ value: string; count: number }> };
        }>
      >('/api/graphql', {
        query: GET_DEVICE_FILTERS_QUERY,
        variables: {
          filter: {
            organizationIds: allOrgIds,
            statuses: [DEVICE_STATUS.ONLINE],
          },
        },
      }),
      apiClient.post<
        GraphQlResponse<{
          deviceFilters: { organizationIds?: Array<{ value: string; count: number }> };
        }>
      >('/api/graphql', {
        query: GET_DEVICE_FILTERS_QUERY,
        variables: {
          filter: {
            organizationIds: allOrgIds,
            statuses: [DEVICE_STATUS.OFFLINE],
          },
        },
      }),
    ]);

    const orgOnlineCounts = new Map<string, number>();
    const orgOfflineCounts = new Map<string, number>();

    if (onlineResponse.ok && onlineResponse.data?.data?.deviceFilters?.organizationIds) {
      for (const entry of onlineResponse.data.data.deviceFilters.organizationIds) {
        orgOnlineCounts.set(entry.value, entry.count);
      }
    }
    if (offlineResponse.ok && offlineResponse.data?.data?.deviceFilters?.organizationIds) {
      for (const entry of offlineResponse.data.data.deviceFilters.organizationIds) {
        orgOfflineCounts.set(entry.value, entry.count);
      }
    }

    const rows: OrganizationOverviewRow[] = organizations
      .map(org => {
        const total = orgDeviceCounts.get(org.organizationId) || 0;
        const active = orgOnlineCounts.get(org.organizationId) || 0;
        const inactive = orgOfflineCounts.get(org.organizationId) || 0;
        const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
        const inactivePct = total > 0 ? Math.round((inactive / total) * 100) : 0;

        return {
          id: org.id,
          organizationId: org.organizationId,
          name: org.name,
          websiteUrl: org.websiteUrl || '',
          imageUrl: org.image?.imageUrl || null,
          total,
          active,
          inactive,
          activePct,
          inactivePct,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { rows, totalOrganizations };
  } catch (error) {
    console.warn('Organizations overview fetch failed:', error);
    return { rows: [], totalOrganizations: 0 };
  }
}

export function useOrganizationsOverview(limit: number = 10) {
  const { isAuthenticated } = useAuthSession();

  const query = useQuery({
    queryKey: dashboardQueryKeys.orgStats(limit),
    queryFn: () => fetchOrganizationsOverview(limit),
    enabled: isAuthenticated,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    throwOnError: false,
    refetchOnWindowFocus: false,
  });

  return {
    rows: query.data?.rows ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    totalOrganizations: query.data?.totalOrganizations ?? 0,
    refresh: query.refetch,

    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
