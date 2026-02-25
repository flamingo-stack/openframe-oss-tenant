'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

export type TenantDomainInfo = {
  domain: string;
  generic: boolean;
  autoAllow: boolean;
};

export type UpdateSharedAutoProvisionPayload = {
  autoAllow: boolean;
};

export type UpdateSharedAutoProvisionResponse = {
  success?: boolean;
  error?: {
    code: string;
    message: string;
  };
};

export function useTenantDomain() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTenantDomain = useCallback(async (): Promise<TenantDomainInfo> => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<TenantDomainInfo>('api/config/global/domain');
      if (!res.ok || !res.data) {
        throw new Error(res.error || `Failed to load tenant domain (${res.status})`);
      }
      // Handle case where autoAllow property doesn't exist - assume false
      return {
        domain: res.data.domain,
        generic: res.data.generic,
        autoAllow: res.data.autoAllow ?? false,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSharedAutoProvision = useCallback(
    async (enabled: boolean): Promise<UpdateSharedAutoProvisionResponse> => {
      setIsUpdating(true);
      try {
        const res = await apiClient.post<UpdateSharedAutoProvisionResponse>('api/config/global/domain', {
          autoAllow: enabled,
        });

        if (!res.ok) {
          // Check for specific error response format
          if (res.data?.error) {
            return {
              error: {
                code: res.data.error.code || 'BAD_REQUEST',
                message: res.data.error.message || 'Failed to update auto provision setting',
              },
            };
          }

          // Handle generic domain error from response body
          const errorData = res.data as any;
          if (errorData?.code === 'BAD_REQUEST' && errorData?.message) {
            return {
              error: {
                code: errorData.code,
                message: errorData.message,
              },
            };
          }

          throw new Error(res.error || `Failed to update auto provision (${res.status})`);
        }

        return { success: true };
      } catch (err) {
        // Re-throw to allow caller to handle
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  return {
    fetchTenantDomain,
    updateSharedAutoProvision,
    isLoading,
    isUpdating,
  };
}
