'use client';

/**
 * REST / ai-agent-GraphQL context items via TanStack Query suspense hooks:
 *   • Ticket — `/chat/graphql` (ai-agent), cursor pagination.
 *   • Policy — Fleet REST, server-side search, full list → client paging.
 *   • Query  — Fleet REST, server-side search + `page`/`per_page` paging.
 *
 * Suspense hooks suspend on initial load (→ the picker's skeleton) and throw on
 * error (→ the picker's error boundary).
 */

import type { ChatContextItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { ContextItemsList } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { CONTEXT_ENTITY_KIND } from './context-types';
import { type ContextItemsProps, MINGO_CONTEXT_PAGE_SIZE, useClientPaging } from './items-shared';

// ───────────────────────────── Ticket ───────────────────────────────────────

const TICKETS_QUERY = `
  query MingoContextTickets($search: String, $pagination: CursorPaginationInput) {
    tickets(search: $search, pagination: $pagination) {
      edges { node { id ticketNumber title status } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface GraphQlEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}
interface TicketsData {
  tickets?: {
    edges?: Array<{ node: { id: string; ticketNumber?: number; title?: string; status?: string } }>;
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  };
}

async function fetchTicketsPage(
  query: string,
  cursor: string | null,
): Promise<{ items: ChatContextItem[]; nextCursor: string | null }> {
  const res = await apiClient.post<GraphQlEnvelope<TicketsData>>('/chat/graphql', {
    query: TICKETS_QUERY,
    variables: {
      search: query || undefined,
      pagination: { limit: MINGO_CONTEXT_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
    },
  });
  if (!res.ok) throw new Error(res.error || 'Failed to load tickets');
  if (res.data?.errors?.length) throw new Error(res.data.errors[0].message);
  const conn = res.data?.data?.tickets;
  const items = (conn?.edges ?? []).map(e => ({
    type: CONTEXT_ENTITY_KIND.TICKET,
    id: e.node.id,
    label: e.node.title || (e.node.ticketNumber != null ? `#${e.node.ticketNumber}` : e.node.id),
    description:
      [e.node.ticketNumber != null ? `#${e.node.ticketNumber}` : null, e.node.status].filter(Boolean).join(' · ') ||
      undefined,
  }));
  return { items, nextCursor: conn?.pageInfo?.hasNextPage ? (conn.pageInfo.endCursor ?? null) : null };
}

export function TicketItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const q = useSuspenseInfiniteQuery({
    queryKey: ['mingo-context', 'tickets', query],
    queryFn: ({ pageParam }) => fetchTicketsPage(query, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    staleTime: 30 * 1000,
  });
  const items = useMemo(() => q.data.pages.flatMap(p => p.items), [q.data]);
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={q.hasNextPage}
      onLoadMore={() => q.fetchNextPage()}
      loadingMore={q.isFetchingNextPage}
      emptyLabel="No tickets"
    />
  );
}

// ───────────────────────────── Policy ───────────────────────────────────────

async function fetchPolicies(query: string): Promise<ChatContextItem[]> {
  const res = await fleetApiClient.getPolicies(query ? { query } : undefined);
  if (!res.ok) throw new Error(res.error || 'Failed to load policies');
  return (res.data?.policies ?? []).map(pol => ({
    type: CONTEXT_ENTITY_KIND.POLICY,
    id: String(pol.id),
    label: pol.name || String(pol.id),
    description: pol.description || undefined,
  }));
}

export function PolicyItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['mingo-context', 'policies', query],
    queryFn: () => fetchPolicies(query),
    staleTime: 30 * 1000,
  });
  const { items, hasMore, loadMore } = useClientPaging(data);
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasMore}
      onLoadMore={loadMore}
      emptyLabel="No policies"
    />
  );
}

// ───────────────────────────── Query ────────────────────────────────────────

async function fetchQueriesPage(query: string, page: number): Promise<{ items: ChatContextItem[]; hasMore: boolean }> {
  const res = await fleetApiClient.getQueries({ ...(query ? { query } : {}), page, per_page: MINGO_CONTEXT_PAGE_SIZE });
  if (!res.ok) throw new Error(res.error || 'Failed to load queries');
  const items = (res.data?.queries ?? []).map(q => ({
    type: CONTEXT_ENTITY_KIND.QUERY,
    id: String(q.id),
    label: q.name || String(q.id),
    description: q.description || undefined,
  }));
  return { items, hasMore: items.length === MINGO_CONTEXT_PAGE_SIZE };
}

export function QueryItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const q = useSuspenseInfiniteQuery({
    queryKey: ['mingo-context', 'queries', query],
    queryFn: ({ pageParam }) => fetchQueriesPage(query, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    staleTime: 30 * 1000,
  });
  const items = useMemo(() => q.data.pages.flatMap(p => p.items), [q.data]);
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={q.hasNextPage}
      onLoadMore={() => q.fetchNextPage()}
      loadingMore={q.isFetchingNextPage}
      emptyLabel="No queries"
    />
  );
}
