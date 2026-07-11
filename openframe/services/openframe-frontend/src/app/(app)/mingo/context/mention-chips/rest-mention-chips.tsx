'use client';
import { routes } from '@/lib/routes';

/**
 * Self-fetching mention chips for the REST / ai-agent-GraphQL entity types. One
 * generic component (`RestMentionChip`) backed by a per-marker async resolver,
 * driven by a TanStack `useSuspenseQuery` so the skeleton/Suspense story matches
 * the Relay chips. Resolvers never throw — they degrade to `{ label: id }` on a
 * failed response — so the chip always renders (id when the name can't load).
 *
 * id semantics + routes (per the picker in `rest-items.tsx` / `batch-items.tsx`):
 *   - policy → fleet `getPolicy(policyId)`        → /monitoring/policy/{id}
 *   - query  → fleet `getQuery(queryId)`          → /monitoring/query/{id}
 *   - user   → REST `/api/users/{userId}`         → (no detail route)
 *   - script → tactical `getScript(id)`           → /scripts/details/{id}
 *   - ticket → ai-agent `ticket(id:)` GraphQL      → /tickets/dialog?id={id}
 *
 * The `script` resolver here is the LEGACY (Tactical) path. New scripts resolve
 * via the Relay `GraphqlMentionChip`; `render-mention.tsx` dispatches by id shape
 * (24-char ObjectId → new, numeric → this Tactical resolver) so BOTH resolve.
 */

import { useSuspenseQuery } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';
import { apiClient } from '@/lib/api-client';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { MentionErrorBoundary, MentionTag, MentionTagSkeleton } from './mention-tag';

interface Resolved {
  label: string;
  href?: string;
}

async function resolvePolicy(id: string): Promise<Resolved> {
  const res = await fleetApiClient.getPolicy(Number(id));
  return { label: (res.ok && res.data?.policy?.name) || id, href: routes.monitoring.policy(id) };
}

async function resolveQuery(id: string): Promise<Resolved> {
  const res = await fleetApiClient.getQuery(Number(id));
  // Fleet wraps the single-query response in `{ query: {...} }` (same as policies
  // under `policy`) — read the nested name, not a flat `res.data.name` (which is
  // always undefined → chip would show the bare id). See `use-query-details.ts`.
  const name = res.ok ? (res.data as unknown as { query?: { name?: string } }).query?.name : undefined;
  return { label: name || id, href: routes.monitoring.query(id) };
}

async function resolveUser(id: string): Promise<Resolved> {
  const res = await apiClient.get<{ firstName?: string; lastName?: string; email?: string }>(
    `/api/users/${encodeURIComponent(id)}`,
  );
  const u = res.ok ? res.data : undefined;
  const fullName = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
  return { label: fullName || u?.email || id };
}

async function resolveScript(id: string): Promise<Resolved> {
  // TODO(openframe-rmm): Tactical RMM removed — the legacy single-script endpoint is gone.
  // Numeric (legacy) script ids can no longer resolve a name, so degrade to the id + link
  // (the caller's `fallbackLabel` is preferred over the raw id in `RestInner`). New scripts
  // resolve via the Relay `GraphqlMentionChip`. See render-mention.tsx dispatch.
  return { label: id, href: routes.scripts.details(id) };
}

interface TicketEnvelope {
  data?: { ticket?: { title?: string; ticketNumber?: number } };
}
async function resolveTicket(id: string): Promise<Resolved> {
  const res = await apiClient.post<TicketEnvelope>('/chat/graphql', {
    query: 'query MingoMentionTicket($id: ID!) { ticket(id: $id) { title ticketNumber } }',
    variables: { id },
  });
  const t = res.ok ? res.data?.data?.ticket : undefined;
  const label = t?.title || (t?.ticketNumber != null ? `#${t.ticketNumber}` : id);
  return { label, href: routes.tickets.dialog(encodeURIComponent(id)) };
}

const RESOLVERS: Record<string, (id: string) => Promise<Resolved>> = {
  policy: resolvePolicy,
  query: resolveQuery,
  user: resolveUser,
  script: resolveScript,
  ticket: resolveTicket,
};

interface RestMentionChipProps {
  marker: string;
  id: string;
  icon?: ReactNode;
  /** Known display name (e.g. a context item's picked label). Shown instead of
   *  the bare `id` when the live resolve can't find the entity. */
  fallbackLabel?: string;
}

function RestInner({ marker, id, icon, fallbackLabel }: RestMentionChipProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['mingo-mention', marker, id],
    queryFn: () => RESOLVERS[marker](id),
    staleTime: 5 * 60 * 1000,
  });
  // Resolvers degrade to `{ label: id }` when the lookup misses; in that case
  // prefer the caller's known label over showing the raw id.
  const label = data.label === id && fallbackLabel ? fallbackLabel : data.label;
  return <MentionTag icon={icon} label={label} href={data.href} />;
}

export function RestMentionChip({ marker, id, icon, fallbackLabel }: RestMentionChipProps) {
  return (
    <MentionErrorBoundary fallback={<MentionTag icon={icon} label={fallbackLabel || id} />}>
      <Suspense fallback={<MentionTagSkeleton icon={icon} />}>
        <RestInner marker={marker} id={id} icon={icon} fallbackLabel={fallbackLabel} />
      </Suspense>
    </MentionErrorBoundary>
  );
}
