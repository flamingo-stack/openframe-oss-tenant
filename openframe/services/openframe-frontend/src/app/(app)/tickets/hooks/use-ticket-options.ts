'use client';

import { useQuery } from '@tanstack/react-query';
import { GET_DEVICES_QUERY } from '@/app/(app)/devices/queries/devices-queries';
import { GET_ORGANIZATIONS_MIN_QUERY } from '@/app/(app)/organizations/queries/organizations-queries';
import type { Tag } from '@/app/components/shared/tags';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { GET_TICKET_LABELS_QUERY } from '../queries/ticket-queries';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { ticketsQueryKeys } from '../utils/query-keys';

export interface AutocompleteOption {
  label: string;
  value: string;
}

export interface AssigneeOption extends AutocompleteOption {
  imageUrl?: string;
}

// --- Organizations (reuse existing query via /api/graphql) ---

async function fetchOrganizationOptions(search: string): Promise<AutocompleteOption[]> {
  const response = await apiClient.post<any>('/api/graphql', {
    query: GET_ORGANIZATIONS_MIN_QUERY,
    variables: { search, first: 50 },
  });
  if (!response.ok) throw new Error(response.error || 'Failed to fetch organizations');

  const edges = response.data?.data?.organizations?.edges ?? [];
  return edges.map(({ node }: any) => ({
    label: node.name,
    value: node.organizationId,
  }));
}

export function useOrganizationOptions(search = '') {
  const query = useQuery({
    queryKey: ['ticket-options', 'organizations', search],
    queryFn: () => fetchOrganizationOptions(search),
  });

  return { options: query.data ?? [], isLoading: query.isLoading };
}

// --- Devices (reuse existing query via /api/graphql) ---

async function fetchDeviceOptions(organizationId?: string, search = ''): Promise<AutocompleteOption[]> {
  const filter = organizationId ? { organizationIds: [organizationId] } : undefined;
  const response = await apiClient.post<any>('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: { search, first: 50, filter },
  });
  if (!response.ok) throw new Error(response.error || 'Failed to fetch devices');

  const edges = response.data?.data?.devices?.edges ?? [];
  return edges.map(({ node }: any) => ({
    label: node.displayName || node.hostname || node.machineId,
    value: node.machineId,
  }));
}

export function useDeviceOptions(organizationId?: string, search = '') {
  const query = useQuery({
    queryKey: ['ticket-options', 'devices', organizationId, search],
    queryFn: () => fetchDeviceOptions(organizationId, search),
    enabled: !!organizationId,
  });

  return { options: query.data ?? [], isLoading: query.isLoading };
}

// --- Users / Assignees (REST via /api/users) ---

async function fetchAssigneeOptions(): Promise<AssigneeOption[]> {
  const response = await apiClient.get<any>('/api/users?page=0&size=100');
  if (!response.ok) throw new Error(response.error || 'Failed to fetch users');

  const items = response.data?.items ?? [];
  return items.map((user: any) => ({
    label: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    value: user.id,
    imageUrl: user.image?.imageUrl,
  }));
}

export function useAssigneeOptions() {
  const query = useQuery({
    queryKey: ['ticket-options', 'assignees'],
    queryFn: fetchAssigneeOptions,
  });

  return { options: query.data ?? [], isLoading: query.isLoading };
}

// --- Labels (ticket-specific, via /chat/graphql) ---

async function fetchLabelOptions(): Promise<AutocompleteOption[]> {
  const response = await apiClient.post<GraphQlResponse<{ ticketLabels: Tag[] }>>(API_ENDPOINTS.GRAPHQL, {
    query: GET_TICKET_LABELS_QUERY,
  });
  const data = extractGraphQlData(response);
  return (data.ticketLabels ?? []).map(label => ({
    label: label.key,
    value: label.id,
  }));
}

export function useTicketLabelOptions() {
  const query = useQuery({
    queryKey: ticketsQueryKeys.labels(),
    queryFn: fetchLabelOptions,
  });

  return { options: query.data ?? [], isLoading: query.isLoading };
}
