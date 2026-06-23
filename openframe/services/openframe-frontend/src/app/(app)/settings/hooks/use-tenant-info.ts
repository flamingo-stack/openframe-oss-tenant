'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TenantInfo, UpdateTenantInfoInput } from '../types/tenant-info';

// tenantInfo query is served by both /api and /chat; updateTenantInfo is saas-api only,
// so both go through the main /api/graphql endpoint.
const MAIN_GRAPHQL_ENDPOINT = '/api/graphql';

/** Tenant image is managed via the REST image endpoints (ImageEntityType.TENANT), like the user avatar. */
export const TENANT_IMAGE_ENDPOINT = '/api/tenants/image';

export const tenantInfoQueryKeys = {
  all: ['tenant-info'] as const,
};

const TENANT_INFO_FIELDS = `
  id
  name
  website
  image {
    imageUrl
    hash
  }
`;

const GET_TENANT_INFO_QUERY = `
  query SettingsTenantInfo {
    tenantInfo {
      ${TENANT_INFO_FIELDS}
    }
  }
`;

const UPDATE_TENANT_INFO_MUTATION = `
  mutation SettingsUpdateTenantInfo($input: UpdateTenantInfoInput!) {
    updateTenantInfo(input: $input) {
      tenantInfo {
        ${TENANT_INFO_FIELDS}
      }
      userErrors {
        message
        field
      }
    }
  }
`;

interface GraphQlEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface UserError {
  message: string;
  field?: string[] | null;
}

export function useTenantInfo() {
  return useQuery({
    queryKey: tenantInfoQueryKeys.all,
    queryFn: async (): Promise<TenantInfo | null> => {
      const res = await apiClient.post<GraphQlEnvelope<{ tenantInfo: TenantInfo | null }>>(MAIN_GRAPHQL_ENDPOINT, {
        query: GET_TENANT_INFO_QUERY,
      });
      if (!res.ok || res.data?.errors?.length) {
        throw new Error(res.error || res.data?.errors?.[0]?.message || 'Failed to load organization info');
      }
      return res.data?.data?.tenantInfo ?? null;
    },
  });
}

export function useUpdateTenantInfo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTenantInfoInput): Promise<TenantInfo> => {
      const res = await apiClient.post<
        GraphQlEnvelope<{ updateTenantInfo: { tenantInfo: TenantInfo | null; userErrors: UserError[] } }>
      >(MAIN_GRAPHQL_ENDPOINT, {
        query: UPDATE_TENANT_INFO_MUTATION,
        variables: { input },
      });

      if (!res.ok || res.data?.errors?.length) {
        throw new Error(res.error || res.data?.errors?.[0]?.message || 'Failed to update organization');
      }

      const payload = res.data?.data?.updateTenantInfo;
      if (payload?.userErrors?.length) {
        throw new Error(payload.userErrors[0].message);
      }
      if (!payload?.tenantInfo) {
        throw new Error('Failed to update organization');
      }
      return payload.tenantInfo;
    },
    onSuccess: tenantInfo => {
      queryClient.setQueryData(tenantInfoQueryKeys.all, tenantInfo);
      toast({
        title: 'Organization Updated',
        description: 'Your organization details have been updated successfully.',
        variant: 'success',
        duration: 3000,
      });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update organization',
        variant: 'destructive',
      });
    },
  });
}
