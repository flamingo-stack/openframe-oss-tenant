'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { CreateOrganizationRequest } from './use-create-organization';

export function useUpdateOrganization() {
  const updateOrganization = useCallback(async (id: string, request: CreateOrganizationRequest) => {
    const resp = await apiClient.put(`/api/organizations/${id}`, request);
    if (!resp.ok) {
      throw new Error(resp.error || `Request failed with status ${resp.status}`);
    }
    return resp.data;
  }, []);

  return { updateOrganization };
}
