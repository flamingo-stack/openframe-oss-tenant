'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { OrganizationSortField, SortDirection } from '@/generated/schema-enums';
import { apiClient } from '@/lib/api-client';
import { GET_ORGANIZATIONS_QUERY } from '../queries/customers-queries';

const ORGANIZATIONS_PAGE_SIZE = 20;

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  websiteUrl: string;
  contact: {
    name: string;
    email: string;
  };
  industry: string;
  mrrUsd: number;
  numberOfEmployees: number;
  contractDue: string;
  lastActivity: string;
  imageUrl?: string | null;
  imageHash?: string | null;
}

export interface OrganizationNode {
  id: string;
  organizationId: string;
  name?: string | null;
  websiteUrl?: string | null;
  category?: string | null;
  numberOfEmployees?: number | null;
  monthlyRevenue?: number | null;
  contractEndDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastActivityAt?: string | null;
  contactInformation?: {
    contacts?: Array<{ contactName?: string | null; email?: string | null }> | null;
  } | null;
  image?: { imageUrl?: string | null; hash?: string | null } | null;
}

export function mapOrganizationNode(node: OrganizationNode): Customer {
  const primaryContact = node.contactInformation?.contacts?.[0];
  return {
    id: node.id,
    organizationId: node.organizationId,
    name: node.name ?? '-',
    websiteUrl: node.websiteUrl ?? '',
    contact: {
      name: primaryContact?.contactName ?? '',
      email: primaryContact?.email ?? '',
    },
    industry: node.category ?? '-',
    mrrUsd: node.monthlyRevenue ?? 0,
    numberOfEmployees: node.numberOfEmployees ?? 0,
    contractDue: node.contractEndDate ?? '',
    lastActivity: node.lastActivityAt || node.updatedAt || node.createdAt || new Date().toISOString(),
    imageUrl: node.image?.imageUrl ?? null,
    imageHash: node.image?.hash ?? null,
  };
}

interface CustomersPage {
  customers: Customer[];
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

/** Server-side last-activity range (UTC instants) + sort direction. */
export interface CustomersDateQuery {
  lastActivityFrom?: string;
  lastActivityTo?: string;
  sortDirection: 'asc' | 'desc';
}

export const customersQueryKeys = {
  all: ['organizations'] as const,
  list: (search: string, status?: string, dateQuery?: CustomersDateQuery) =>
    [
      'organizations',
      'list',
      search,
      status,
      dateQuery?.lastActivityFrom,
      dateQuery?.lastActivityTo,
      dateQuery?.sortDirection,
    ] as const,
};

export function useCustomers(search = '', status?: string, dateQuery?: CustomersDateQuery) {
  const { toast } = useToast();

  const query = useInfiniteQuery<CustomersPage, Error>({
    queryKey: customersQueryKeys.list(search, status, dateQuery),
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
          first: ORGANIZATIONS_PAGE_SIZE,
          after: (pageParam as string) || null,
          filter:
            status || dateQuery?.lastActivityFrom || dateQuery?.lastActivityTo
              ? {
                  ...(status ? { status } : {}),
                  ...(dateQuery?.lastActivityFrom ? { lastActivityFrom: dateQuery.lastActivityFrom } : {}),
                  ...(dateQuery?.lastActivityTo ? { lastActivityTo: dateQuery.lastActivityTo } : {}),
                }
              : undefined,
          orderBy: {
            field: OrganizationSortField.LAST_ACTIVITY,
            direction: dateQuery?.sortDirection === 'asc' ? SortDirection.ASC : SortDirection.DESC,
          },
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

      const customers: Customer[] = graphqlResponse.data.organizations.edges.map(({ node }) =>
        mapOrganizationNode(node as OrganizationNode),
      );

      return {
        customers,
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
        title: 'Error fetching customers',
        description: query.error.message,
        variant: 'destructive',
      });
    }
  }, [query.error, toast]);

  const customers = useMemo(() => query.data?.pages.flatMap(page => page.customers) ?? [], [query.data?.pages]);

  return {
    customers,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    filteredCount: query.data?.pages[0]?.filteredCount ?? 0,
    refetch: query.refetch,
  };
}
