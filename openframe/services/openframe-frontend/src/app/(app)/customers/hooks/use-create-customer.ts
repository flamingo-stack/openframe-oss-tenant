'use client';

import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface ContactPersonDto {
  contactName: string;
  title: string;
  phone: string;
  email: string;
}

export interface AddressDto {
  street1: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ContactInformationDto {
  contacts: ContactPersonDto[];
  physicalAddress: AddressDto;
  mailingAddress: AddressDto;
  mailingAddressSameAsPhysical: boolean;
}

export interface CreateCustomerRequest {
  name: string;
  category?: string;
  numberOfEmployees?: number | null;
  websiteUrl?: string;
  notes?: string;
  contactInformation: ContactInformationDto;
  monthlyRevenue?: number | null;
  contractStartDate?: string;
  contractEndDate?: string;
}

export function useCreateCustomer() {
  const createOrganization = useCallback(async (request: CreateCustomerRequest) => {
    const resp = await apiClient.post('/api/organizations', request);
    if (!resp.ok) {
      throw new Error(resp.error || `Request failed with status ${resp.status}`);
    }
    return resp.data;
  }, []);

  return { createOrganization };
}
