'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { GET_ORGANIZATIONS_QUERY } from '../queries/organizations-queries';

const ORGANIZATIONS_PAGE_SIZE = 20;

export interface Organization {
  id: string;
  organizationId: string;
  name: string;
  websiteUrl: string;
  contact: {
    name: string;
    email: string;
  };
  tier: 'Basic' | 'Premium' | 'Enterprise';
  industry: string;
  mrrUsd: number;
  contractDue: string;
  lastActivity: string;
  imageUrl?: string | null;
}

interface OrganizationsPage {
  organizations: Organization[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  filteredCount: number;
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export const organizationsQueryKeys = {
  all: ['organizations'] as const,
  list: (search: string) => ['organizations', 'list', search] as const,
};

export function useOrganizations(search = '') {
  const { toast } = useToast();

  const query = useInfiniteQuery<OrganizationsPage, Error>({
    queryKey: organizationsQueryKeys.list(search),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.post<
        GraphQlResponse<{
          organizations: {
            edges: Array<{ node: any; cursor: string }>;
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
        query: GET_ORGANIZATIONS_QUERY,
        variables: {
          search: search || '',
          pagination: { limit: ORGANIZATIONS_PAGE_SIZE, cursor: (pageParam as string) || null },
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

      const nodes = graphqlResponse.data.organizations.edges.map(e => e.node);
      const organizations: Organization[] = nodes.map(
        (o: any): Organization => ({
          id: o.id,
          organizationId: o.organizationId,
          name: o.name ?? '-',
          websiteUrl: o.websiteUrl ?? '-',
          contact: { name: '', email: '' },
          tier: 'Basic',
          industry: o.category ?? '-',
          mrrUsd: o.monthlyRevenue ?? 0,
          contractDue: o.contractEndDate ?? '',
          lastActivity: o.updatedAt || o.createdAt || new Date().toISOString(),
          imageUrl: o.image?.imageUrl || null,
        }),
      );

      return {
        organizations,
        pageInfo: graphqlResponse.data.organizations.pageInfo,
        filteredCount: graphqlResponse.data.organizations.filteredCount,
      };
    },
    getNextPageParam: lastPage => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Error fetching organizations',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  const organizations = useMemo(() => query.data?.pages.flatMap(page => page.organizations) ?? [], [query.data?.pages]);

  return {
    organizations,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    filteredCount: query.data?.pages[0]?.filteredCount ?? 0,
    refetch: query.refetch,
  };
}
