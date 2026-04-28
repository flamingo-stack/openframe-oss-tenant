'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export function useDeleteOrganization() {
  const deleteOrganization = useCallback(async (id: string) => {
    const resp = await apiClient.delete(`/api/organizations/${id}`);
    if (!resp.ok) {
      throw new Error(resp.error || `Request failed with status ${resp.status}`);
    }
    return resp.data;
  }, []);

  return { deleteOrganization };
}
