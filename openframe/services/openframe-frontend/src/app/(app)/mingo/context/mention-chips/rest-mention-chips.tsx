'use client';

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
 *   - script → tactical `getScripts()` + find     → /scripts/details/{id}
 *   - ticket → ai-agent `ticket(id:)` GraphQL      → /tickets/dialog?id={id}
 */

import { useSuspenseQuery } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';
import { apiClient } from '@/lib/api-client';
import { fleetApiClient } from '@/lib/fleet-api-client';
import { tacticalApiClient } from '@/lib/tactical-api-client';
import { MentionErrorBoundary, MentionTag, MentionTagSkeleton } from './mention-tag';

interface Resolved {
  label: string;
  href?: string;
}

async function resolvePolicy(id: string): Promise<Resolved> {
  const res = await fleetApiClient.getPolicy(Number(id));
  return { label: (res.ok && res.data?.policy?.name) || id, href: `/monitoring/policy/${id}` };
}

async function resolveQuery(id: string): Promise<Resolved> {
  const res = await fleetApiClient.getQuery(Number(id));
  return { label: (res.ok && res.data?.name) || id, href: `/monitoring/query/${id}` };
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
  const res = await tacticalApiClient.getScripts();
  const list = (res.ok && Array.isArray(res.data) ? res.data : []) as Array<{ id: number | string; name?: string }>;
  const s = list.find(x => String(x.id) === id);
  return { label: s?.name || id, href: `/scripts/details/${id}` };
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
  return { label, href: `/tickets/dialog?id=${encodeURIComponent(id)}` };
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
}

function RestInner({ marker, id, icon }: RestMentionChipProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['mingo-mention', marker, id],
    queryFn: () => RESOLVERS[marker](id),
    staleTime: 5 * 60 * 1000,
  });
  return <MentionTag icon={icon} label={data.label} href={data.href} />;
}

export function RestMentionChip({ marker, id, icon }: RestMentionChipProps) {
  return (
    <MentionErrorBoundary fallback={<MentionTag icon={icon} label={id} />}>
      <Suspense fallback={<MentionTagSkeleton icon={icon} />}>
        <RestInner marker={marker} id={id} icon={icon} />
      </Suspense>
    </MentionErrorBoundary>
  );
}
