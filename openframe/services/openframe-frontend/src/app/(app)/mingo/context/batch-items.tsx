'use client';

/**
 * Batch context items — fetched as ONE full batch (cached via TanStack suspense),
 * then SEARCHED and PAGED entirely on the client. These sources have no usable
 * server-side search for this picker.
 *   • LegacyScriptItems — Tactical scripts. The `scripts-v2` flag-OFF dropdown
 *     source; the flag-ON source is the Relay `ScriptItems` in `relay-items.tsx`.
 *     (Dispatched by `renderMingoContextItems`.)
 *   • UserItems — core users.
 */

import type { ChatContextItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { ContextItemsList } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { CONTEXT_ENTITY_KIND } from './context-types';
import { type ContextItemsProps, matches, useClientPaging } from './items-shared';

// ──────────────────────── Script (legacy / Tactical) ─────────────────────────

// TODO(openframe-rmm): Tactical RMM removed — the legacy script context source has no
// backend. Returns an empty list (flag-ON scripts still resolve via the Relay `ScriptItems`
// in relay-items.tsx). Delete this source once the flag-OFF `/scripts` path is retired.
async function fetchAllScripts(): Promise<ChatContextItem[]> {
  return [];
}

export function LegacyScriptItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['mingo-context', 'scripts-all'],
    queryFn: fetchAllScripts,
    staleTime: 5 * 60 * 1000,
  });
  const filtered = useMemo(
    () => data.filter(s => matches(s.label, query) || matches(s.description, query)),
    [data, query],
  );
  const { items, hasMore, loadMore } = useClientPaging(filtered);
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasMore}
      onLoadMore={loadMore}
      emptyLabel="No scripts"
    />
  );
}

// ───────────────────────────── User ─────────────────────────────────────────

interface UserRow {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

async function fetchAllUsers(): Promise<ChatContextItem[]> {
  const acc: UserRow[] = [];
  const size = 200;
  for (let page = 0; page < 100; page++) {
    const res = await apiClient.get<{ items?: UserRow[]; hasNext?: boolean }>(`/api/users?page=${page}&size=${size}`);
    if (!res.ok) throw new Error(res.error || 'Failed to load users');
    const items = res.data?.items ?? [];
    acc.push(...items);
    if (!res.data?.hasNext || items.length === 0) break;
  }
  return acc.map(u => {
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return {
      type: CONTEXT_ENTITY_KIND.USER,
      id: u.id,
      label: fullName || u.email || u.id,
      description: fullName ? u.email : u.status,
    };
  });
}

export function UserItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['mingo-context', 'users-all'],
    queryFn: fetchAllUsers,
    staleTime: 5 * 60 * 1000,
  });
  const filtered = useMemo(
    () => data.filter(u => matches(u.label, query) || matches(u.description, query)),
    [data, query],
  );
  const { items, hasMore, loadMore } = useClientPaging(filtered);
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasMore}
      onLoadMore={loadMore}
      emptyLabel="No users"
    />
  );
}
