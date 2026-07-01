'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { GET_ORGANIZATIONS_MIN_QUERY } from '@/app/(app)/customers/queries/customers-queries';
import { GET_DEVICES_QUERY } from '@/app/(app)/devices/queries/devices-queries';
import type { Tag } from '@/app/components/shared/tags';
import { apiClient } from '@/lib/api-client';
import { getFullImageUrl } from '@/lib/image-url';
import { API_ENDPOINTS } from '../constants';
import { GET_TICKET_LABELS_QUERY, GET_TICKETS_QUERY } from '../queries/ticket-queries';
import { useTicketStatusesQuery } from '../statuses/hooks/use-ticket-statuses-query';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { ticketsQueryKeys } from '../utils/query-keys';

export interface AutocompleteOption {
  label: string;
  value: string;
}

export interface AvatarOption extends AutocompleteOption {
  imageUrl?: string;
}

const EMPTY_AUTOCOMPLETE_OPTIONS: AutocompleteOption[] = [];
const EMPTY_AVATAR_OPTIONS: AvatarOption[] = [];

// --- Organizations (reuse existing query via /api/graphql) ---

async function fetchCustomerOptions(search: string): Promise<AvatarOption[]> {
  const response = await apiClient.post<any>('/api/graphql', {
    query: GET_ORGANIZATIONS_MIN_QUERY,
    variables: { search, first: 50 },
  });
  if (!response.ok) throw new Error(response.error || 'Failed to fetch customers');

  const edges = response.data?.data?.organizations?.edges ?? [];
  return edges.map(({ node }: any) => ({
    label: node.name,
    value: node.organizationId,
    imageUrl: getFullImageUrl(node.image?.imageUrl, node.image?.hash),
  }));
}

export function useOrganizationOptions(search = '', enabled = true) {
  const query = useQuery({
    queryKey: ['ticket-options', 'organizations', search],
    queryFn: () => fetchCustomerOptions(search),
    enabled,
  });

  return { options: query.data ?? EMPTY_AVATAR_OPTIONS, isLoading: query.isLoading };
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

  return { options: query.data ?? EMPTY_AUTOCOMPLETE_OPTIONS, isLoading: query.isLoading };
}

// --- Users / Assignees (REST via /api/users) ---

async function fetchAssigneeOptions(): Promise<AvatarOption[]> {
  const response = await apiClient.get<any>('/api/users?page=0&size=100');
  if (!response.ok) throw new Error(response.error || 'Failed to fetch users');

  const items = response.data?.items ?? [];
  return items.map((user: any) => ({
    label: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    value: user.id,
    imageUrl: getFullImageUrl(user.image?.imageUrl, user.image?.hash),
  }));
}

export function useAssigneeOptions(enabled = true) {
  const query = useQuery({
    queryKey: ['ticket-options', 'assignees'],
    queryFn: fetchAssigneeOptions,
    enabled,
  });

  return { options: query.data ?? EMPTY_AVATAR_OPTIONS, isLoading: query.isLoading };
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

  return { options: query.data ?? EMPTY_AUTOCOMPLETE_OPTIONS, isLoading: query.isLoading };
}

// --- Ticket search ---

interface TicketSearchNode {
  id: string;
  ticketNumber: number | null;
  title: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationImage?: { imageUrl?: string | null; hash?: string | null } | null;
  statusDefinition?: { kind?: string | null } | null;
}

/** A ticket option carrying its organization, so the customer field can be derived from it. */
export interface TicketSearchOption extends AutocompleteOption {
  organizationId?: string | null;
  organizationName?: string | null;
  organizationImageUrl?: string | null;
}

const EMPTY_TICKET_SEARCH_OPTIONS: TicketSearchOption[] = [];

async function fetchTicketSearchOptions(
  search: string,
  organizationId?: string,
  statusIds?: string[],
): Promise<TicketSearchOption[]> {
  const filter: Record<string, unknown> = {};
  if (organizationId) filter.organizationIds = [organizationId];
  // Scope to non-archived statuses so archived tickets aren't offered (and don't consume the
  // result limit). Client-side `kind` check below is a safety net if the id list is unavailable.
  if (statusIds?.length) filter.statusIds = statusIds;

  const response = await apiClient.post<GraphQlResponse<{ tickets: { edges: Array<{ node: TicketSearchNode }> } }>>(
    API_ENDPOINTS.GRAPHQL,
    {
      query: GET_TICKETS_QUERY,
      variables: {
        search: search || undefined,
        filter: Object.keys(filter).length ? filter : undefined,
        pagination: { limit: 50 },
      },
    },
  );
  const data = extractGraphQlData(response);
  return (data.tickets?.edges ?? [])
    .filter(({ node }) => node.statusDefinition?.kind !== 'ARCHIVED')
    .map(({ node }) => {
      const number = node.ticketNumber != null ? `#${node.ticketNumber}` : '';
      const label = [number, node.title].filter(Boolean).join(' ') || node.id;
      return {
        label,
        value: node.id,
        organizationId: node.organizationId,
        organizationName: node.organizationName,
        organizationImageUrl: getFullImageUrl(node.organizationImage?.imageUrl, node.organizationImage?.hash),
      };
    });
}

export function useTicketSearchOptions(search = '', organizationId?: string) {
  const statusesQuery = useTicketStatusesQuery({ enabled: true });
  const nonArchivedStatusIds = useMemo(
    () => statusesQuery.data?.snapshot.filter(status => status.kind !== 'ARCHIVED').map(status => status.id),
    [statusesQuery.data],
  );

  const query = useQuery({
    queryKey: ['ticket-options', 'tickets', search, organizationId ?? null, nonArchivedStatusIds ?? null],
    queryFn: () => fetchTicketSearchOptions(search, organizationId, nonArchivedStatusIds),
    enabled: !statusesQuery.isLoading,
  });

  return {
    options: query.data ?? EMPTY_TICKET_SEARCH_OPTIONS,
    isLoading: statusesQuery.isLoading || query.isLoading,
  };
}

/** Build a customer (organization) autocomplete option from a ticket, or null when it has none. */
export function customerOptionFromTicket(ticket: TicketSearchOption | null | undefined): AvatarOption | null {
  if (!ticket?.organizationId) return null;
  return {
    value: ticket.organizationId,
    label: ticket.organizationName || ticket.organizationId,
    imageUrl: ticket.organizationImageUrl ?? undefined,
  };
}
