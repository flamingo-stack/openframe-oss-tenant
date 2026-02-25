'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '../../../lib/api-client';

export type ApiKeyRecord = {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string | null;
  expiresAt?: string | null;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
};

export function useApiKeys() {
  const [items, setItems] = useState<ApiKeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiKeyRecord[]>('api/api-keys');
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error(res.error || `Failed to load API keys (${res.status})`);
      }
      setItems(res.data);
      return res.data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load API keys';
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createApiKey = useCallback(async (data: { name: string; description?: string; expiresAt?: string | null }) => {
    const payload: any = {
      name: data.name,
      description: data.description || undefined,
      expiresAt: data.expiresAt ?? null,
    };
    const res = await apiClient.post<{ apiKey: ApiKeyRecord; fullKey: string }>('api/api-keys', payload);
    if (!res.ok || !res.data) {
      throw new Error(res.error || `Failed to create API key (${res.status})`);
    }
    return res.data;
  }, []);

  const updateApiKey = useCallback(
    async (id: string, data: { name: string; description?: string; expiresAt?: string | null }) => {
      const payload: any = {
        name: data.name,
        description: data.description || undefined,
        expiresAt: data.expiresAt ?? null,
      };
      const res = await apiClient.put<ApiKeyRecord>(`api/api-keys/${encodeURIComponent(id)}`, payload);
      if (!res.ok || !res.data) {
        throw new Error(res.error || `Failed to update API key (${res.status})`);
      }
      return res.data;
    },
    [],
  );

  const regenerateApiKey = useCallback(async (id: string) => {
    const res = await apiClient.post<{ apiKey: ApiKeyRecord; fullKey: string }>(
      `api/api-keys/${encodeURIComponent(id)}/regenerate`,
    );
    if (!res.ok || !res.data) {
      throw new Error(res.error || `Failed to regenerate API key (${res.status})`);
    }
    return res.data;
  }, []);

  const setApiKeyEnabled = useCallback(async (id: string, enabled: boolean) => {
    const res = await apiClient.put<ApiKeyRecord>(`api/api-keys/${encodeURIComponent(id)}`, { enabled });
    if (!res.ok || !res.data) {
      throw new Error(res.error || `Failed to ${enabled ? 'enable' : 'disable'} API key (${res.status})`);
    }
    return res.data;
  }, []);

  return { items, isLoading, error, fetchApiKeys, createApiKey, updateApiKey, regenerateApiKey, setApiKeyEnabled };
}
