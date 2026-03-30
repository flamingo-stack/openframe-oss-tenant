'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export function useOrganizationArchive() {
  const checkCanArchive = useCallback(async (id: string): Promise<boolean> => {
    const resp = await apiClient.get<boolean>(`/api/organizations/${id}/can-archive`);
    if (!resp.ok) {
      throw new Error(resp.error || 'Failed to check archive eligibility');
    }
    return resp.data as boolean;
  }, []);

  const archiveOrganization = useCallback(async (id: string) => {
    const resp = await apiClient.patch(`/api/organizations/${id}/status`, { status: 'ARCHIVED' });
    if (!resp.ok) {
      throw new Error(resp.error || 'Failed to archive organization');
    }
    return resp.data;
  }, []);

  const restoreOrganization = useCallback(async (id: string) => {
    const resp = await apiClient.patch(`/api/organizations/${id}/status`, { status: 'ACTIVE' });
    if (!resp.ok) {
      throw new Error(resp.error || 'Failed to restore organization');
    }
    return resp.data;
  }, []);

  return { checkCanArchive, archiveOrganization, restoreOrganization };
}
