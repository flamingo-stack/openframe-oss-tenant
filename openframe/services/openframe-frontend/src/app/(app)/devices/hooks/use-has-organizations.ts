'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { HAS_ORGANIZATIONS_QUERY } from '../queries/devices-queries';
import type { GraphQlResponse } from '../types/device.types';

interface HasOrganizationsData {
  organizations: {
    edges: Array<{ node: { id: string } }>;
  };
}

/**
 * Returns whether the current tenant has at least one organization (customer).
 *
 * Drives the Devices page "no customer" state: when there are no organizations,
 * the "Add Device" action is disabled (a device must belong to a customer) and
 * the user is prompted to add a customer first.
 *
 * While loading, `hasOrganizations` is `undefined` so callers can avoid flashing
 * the empty-customer UI before the answer is known.
 */
export function useHasOrganizations() {
  const { data, isLoading } = useQuery<boolean, Error>({
    queryKey: ['organizations', 'has-any'],
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<HasOrganizationsData>>('/api/graphql', {
        query: HAS_ORGANIZATIONS_QUERY,
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const errors = response.data?.errors;
      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return (response.data?.data?.organizations?.edges?.length ?? 0) > 0;
    },
    staleTime: 60 * 1000,
  });

  return { hasOrganizations: data, isLoading };
}
