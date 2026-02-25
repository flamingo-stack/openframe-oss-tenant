'use client';

import { useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';

export type AvailableProvider = {
  provider: string;
  displayName: string;
};

export type ProviderConfig = {
  id: string | null;
  provider: string;
  clientId: string | null;
  clientSecret: string | null;
  msTenantId?: string | null;
  enabled: boolean;
  autoProvisionUsers?: boolean;
  allowedDomains?: string[];
};

export type UpdateSsoPayload = {
  clientId: string;
  clientSecret: string;
  msTenantId?: string | null;
  autoProvisionUsers?: boolean;
  allowedDomains?: string[];
};

export function useSsoConfig() {
  const fetchAvailableProviders = useCallback(async (): Promise<AvailableProvider[]> => {
    const res = await apiClient.get<AvailableProvider[]>('api/sso/providers/available');
    if (!res.ok || !Array.isArray(res.data)) {
      throw new Error(res.error || `Failed to load providers (${res.status})`);
    }
    return res.data;
  }, []);

  const fetchProviderConfig = useCallback(async (provider: string): Promise<ProviderConfig | undefined> => {
    const res = await apiClient.get<ProviderConfig>(`api/sso/${encodeURIComponent(provider)}`);
    if (!res.ok) {
      // If no config exists, treat as undefined rather than throwing
      return undefined;
    }
    return res.data;
  }, []);

  const updateProviderConfig = useCallback(async (provider: string, payload: UpdateSsoPayload): Promise<void> => {
    const res = await apiClient.put<void>(`api/sso/${encodeURIComponent(provider)}`, payload);
    if (!res.ok) {
      throw new Error(res.error || `Failed to update provider (${res.status})`);
    }
  }, []);

  const toggleProviderEnabled = useCallback(async (provider: string, enabled: boolean): Promise<void> => {
    const res = await apiClient.patch<void>(
      `api/sso/${encodeURIComponent(provider)}/toggle?enabled=${enabled ? 'true' : 'false'}`,
    );
    if (!res.ok) {
      throw new Error(res.error || `Failed to toggle provider (${res.status})`);
    }
  }, []);

  return { fetchAvailableProviders, fetchProviderConfig, updateProviderConfig, toggleProviderEnabled };
}
