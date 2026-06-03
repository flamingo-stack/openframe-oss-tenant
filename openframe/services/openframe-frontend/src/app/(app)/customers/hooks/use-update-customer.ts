'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { CreateCustomerRequest } from './use-create-customer';

export function useUpdateCustomer() {
  const updateOrganization = useCallback(async (id: string, request: CreateCustomerRequest) => {
    const resp = await apiClient.put(`/api/organizations/${id}`, request);
    if (!resp.ok) {
      throw new Error(resp.error || `Request failed with status ${resp.status}`);
    }
    return resp.data;
  }, []);

  return { updateOrganization };
}
