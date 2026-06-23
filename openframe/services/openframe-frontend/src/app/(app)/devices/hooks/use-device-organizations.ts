'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DeviceOrganizationOption {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  imageUrl?: string;
  imageHash?: string;
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface OrganizationsResponse {
  organizations: {
    edges: Array<{
      node: {
        id: string;
        organizationId: string;
        name: string;
        isDefault: boolean;
        image?: { imageUrl?: string | null; hash?: string | null } | null;
      };
    }>;
  };
}

const GET_ORGANIZATIONS_OPTIONS_QUERY = `
  query GetOrganizationsOptions($first: Int!) {
    organizations(first: $first) {
      edges {
        node {
          id
          organizationId
          name
          isDefault
          image {
            imageUrl
            hash
          }
        }
      }
    }
  }
`;

export const deviceOrganizationsQueryKeys = {
  all: ['organizations'] as const,
  options: (first: number) => ['organizations', 'options', first] as const,
};

/**
 * Fetches organizations for selection dropdowns via TanStack Query (apiClient +
 * GraphQL POST), replacing the previous Relay `useLazyLoadQuery`. Suspends while
 * loading to keep the surrounding `<Suspense>` skeleton behaviour. The query key
 * is prefixed with `organizations` so it shares invalidation with the other org
 * caches (e.g. after a customer is created/updated).
 */
export function useDeviceOrganizations(first = 100): DeviceOrganizationOption[] {
  const { data } = useSuspenseQuery({
    queryKey: deviceOrganizationsQueryKeys.options(first),
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<OrganizationsResponse>>('/api/graphql', {
        query: GET_ORGANIZATIONS_OPTIONS_QUERY,
        variables: { first },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const body = response.data;
      if (body?.errors?.length) {
        throw new Error(body.errors[0]?.message || 'GraphQL error occurred');
      }

      const edges = body?.data?.organizations?.edges ?? [];
      return edges.map(({ node }) => ({
        id: node.id,
        organizationId: node.organizationId,
        name: node.name,
        isDefault: node.isDefault,
        imageUrl: node.image?.imageUrl ?? undefined,
        imageHash: node.image?.hash ?? undefined,
      }));
    },
  });

  return data;
}
