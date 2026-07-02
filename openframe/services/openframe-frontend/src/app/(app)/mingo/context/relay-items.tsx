'use client';

/**
 * Relay-backed context items for the GraphQL sources on OUR endpoint
 * (`/api/graphql`): Device, Organization, Knowledge Article.
 *
 * Idiomatic Relay cursor pagination: a `@refetchable` fragment with
 * `@connection` + `useLazyLoadQuery` (suspends on initial load → the picker's
 * Suspense skeleton) + `usePaginationFragment` (`loadNext` on scroll). No manual
 * cursors / `hasMore` — Relay manages the connection in its store.
 */

import { ContextItemsList } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useMemo } from 'react';
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { relayItemsDevices_query$key } from '@/__generated__/relayItemsDevices_query.graphql';
import type { relayItemsDevicesListQuery } from '@/__generated__/relayItemsDevicesListQuery.graphql';
import type { relayItemsKb_query$key } from '@/__generated__/relayItemsKb_query.graphql';
import type { relayItemsKbListQuery } from '@/__generated__/relayItemsKbListQuery.graphql';
import type { relayItemsOrgs_query$key } from '@/__generated__/relayItemsOrgs_query.graphql';
import type { relayItemsOrgsListQuery } from '@/__generated__/relayItemsOrgsListQuery.graphql';
import type { relayItemsScripts_query$key } from '@/__generated__/relayItemsScripts_query.graphql';
import type { relayItemsScriptsListQuery } from '@/__generated__/relayItemsScriptsListQuery.graphql';
import { decodeGlobalId } from '@/lib/relay-id';
import { CONTEXT_ENTITY_KIND } from './context-types';
import { type ContextItemsProps, MINGO_CONTEXT_PAGE_SIZE } from './items-shared';

// ───────────────────────────── Device ───────────────────────────────────────

// Mingo device context is restricted to live/relevant devices only: ONLINE
// (rendered as the green "active" state) and OFFLINE. Pending (the backend
// `ACTIVE`/`PENDING` enum), archived, deleted, decommissioned, etc. are
// excluded so Mingo never lists or suggests actions on irrelevant devices.
// Mirrors `DEFAULT_DASHBOARD_STATUSES` ([ONLINE, OFFLINE]); the values are
// inlined because the Relay compiler needs a static document.
const DEVICES_FRAGMENT = graphql`
  fragment relayItemsDevices_query on Query
  @refetchable(queryName: "relayItemsDevicesPaginationQuery")
  @argumentDefinitions(search: { type: "String" }, first: { type: "Int", defaultValue: 10 }, after: { type: "String" }) {
    devices(filter: { statuses: [ONLINE, OFFLINE] }, search: $search, first: $first, after: $after)
      @connection(key: "relayItemsDevices_devices") {
      edges { node { id machineId hostname displayName status } }
    }
  }
`;

const DEVICES_LIST_QUERY = graphql`
  query relayItemsDevicesListQuery($search: String, $first: Int) {
    ...relayItemsDevices_query @arguments(search: $search, first: $first)
  }
`;

export function DeviceItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const root = useLazyLoadQuery<relayItemsDevicesListQuery>(DEVICES_LIST_QUERY, {
    search: query || null,
    first: MINGO_CONTEXT_PAGE_SIZE,
  });
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    DEVICES_FRAGMENT,
    root as relayItemsDevices_query$key,
  );
  const items = useMemo(
    () =>
      (data.devices?.edges ?? []).flatMap(e =>
        e?.node
          ? [
              {
                type: CONTEXT_ENTITY_KIND.DEVICE,
                // Store the RAW db id, decoded from the Relay global `id`
                // (`base64("Machine:<rawId>")`) — that's what the backend's
                // DEVICE context resolver + `@device:<id>` mention marker expect.
                // The chip re-encodes it to a global id for its `node(id:)` fetch
                // (see relay-mention-chips). Falls back to `machineId` if decode
                // ever fails.
                id: decodeGlobalId(e.node.id)?.rawId ?? e.node.machineId,
                label: e.node.displayName || e.node.hostname || e.node.machineId,
                description: e.node.status ?? undefined,
              },
            ]
          : [],
      ),
    [data],
  );
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasNext}
      onLoadMore={() => loadNext(MINGO_CONTEXT_PAGE_SIZE)}
      loadingMore={isLoadingNext}
      emptyLabel="No devices"
    />
  );
}

// ─────────────────────────── Organization ───────────────────────────────────

const ORGS_FRAGMENT = graphql`
  fragment relayItemsOrgs_query on Query
  @refetchable(queryName: "relayItemsOrgsPaginationQuery")
  @argumentDefinitions(search: { type: "String" }, first: { type: "Int", defaultValue: 10 }, after: { type: "String" }) {
    organizations(search: $search, first: $first, after: $after) @connection(key: "relayItemsOrgs_organizations") {
      edges { node { id name category } }
    }
  }
`;

const ORGS_LIST_QUERY = graphql`
  query relayItemsOrgsListQuery($search: String, $first: Int) {
    ...relayItemsOrgs_query @arguments(search: $search, first: $first)
  }
`;

export function OrganizationItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const root = useLazyLoadQuery<relayItemsOrgsListQuery>(ORGS_LIST_QUERY, {
    search: query || null,
    first: MINGO_CONTEXT_PAGE_SIZE,
  });
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    ORGS_FRAGMENT,
    root as relayItemsOrgs_query$key,
  );
  const items = useMemo(
    () =>
      (data.organizations?.edges ?? []).flatMap(e =>
        e?.node
          ? [
              {
                type: CONTEXT_ENTITY_KIND.ORGANIZATION,
                // Raw db id (organizationId), decoded from the global `id`
                // (`base64("Organization:<rawId>")`); the chip re-encodes it.
                id: decodeGlobalId(e.node.id)?.rawId ?? e.node.id,
                label: e.node.name || e.node.id,
                description: e.node.category ?? undefined,
              },
            ]
          : [],
      ),
    [data],
  );
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasNext}
      onLoadMore={() => loadNext(MINGO_CONTEXT_PAGE_SIZE)}
      loadingMore={isLoadingNext}
      emptyLabel="No customers"
    />
  );
}

// ─────────────────────────── Knowledge Article ──────────────────────────────

const KB_FRAGMENT = graphql`
  fragment relayItemsKb_query on Query
  @refetchable(queryName: "relayItemsKbPaginationQuery")
  @argumentDefinitions(search: { type: "String" }, first: { type: "Int", defaultValue: 10 }, after: { type: "String" }) {
    knowledgeBaseItems(filter: { type: ARTICLE }, search: $search, first: $first, after: $after)
      @connection(key: "relayItemsKb_knowledgeBaseItems") {
      edges { node { id name type } }
    }
  }
`;

const KB_LIST_QUERY = graphql`
  query relayItemsKbListQuery($search: String, $first: Int) {
    ...relayItemsKb_query @arguments(search: $search, first: $first)
  }
`;

export function KnowledgeBaseItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const root = useLazyLoadQuery<relayItemsKbListQuery>(KB_LIST_QUERY, {
    search: query || null,
    first: MINGO_CONTEXT_PAGE_SIZE,
  });
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(KB_FRAGMENT, root as relayItemsKb_query$key);
  const items = useMemo(
    () =>
      (data.knowledgeBaseItems?.edges ?? []).flatMap(e =>
        e?.node
          ? [
              {
                type: CONTEXT_ENTITY_KIND.KB_ARTICLE,
                // Raw db id, decoded from the global `id`
                // (`base64("KnowledgeBaseItem:<rawId>")`); the chip re-encodes it.
                id: decodeGlobalId(e.node.id)?.rawId ?? e.node.id,
                label: e.node.name || e.node.id,
                description: e.node.type ?? undefined,
              },
            ]
          : [],
      ),
    [data],
  );
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasNext}
      onLoadMore={() => loadNext(MINGO_CONTEXT_PAGE_SIZE)}
      loadingMore={isLoadingNext}
      emptyLabel="No knowledge articles"
    />
  );
}

// ───────────────────────────── Script ───────────────────────────────────────

// Mingo script context lists ACTIVE scripts only — ARCHIVED / DELETED are
// excluded so Mingo never suggests running a retired script. Native OpenFrame
// GraphQL `scripts(...)` connection (the v2 source), with server-side search.
// `[ACTIVE]` is inlined because the Relay compiler needs a static document.
const SCRIPTS_FRAGMENT = graphql`
  fragment relayItemsScripts_query on Query
  @refetchable(queryName: "relayItemsScriptsPaginationQuery")
  @argumentDefinitions(search: { type: "String" }, first: { type: "Int", defaultValue: 10 }, after: { type: "String" }) {
    scripts(filter: { statuses: [ACTIVE] }, search: $search, first: $first, after: $after)
      @connection(key: "relayItemsScripts_scripts") {
      edges { node { id name description } }
    }
  }
`;

const SCRIPTS_LIST_QUERY = graphql`
  query relayItemsScriptsListQuery($search: String, $first: Int) {
    ...relayItemsScripts_query @arguments(search: $search, first: $first)
  }
`;

export function ScriptItems({ query, selectedKeys, onToggle, atLimit }: ContextItemsProps) {
  const root = useLazyLoadQuery<relayItemsScriptsListQuery>(SCRIPTS_LIST_QUERY, {
    search: query || null,
    first: MINGO_CONTEXT_PAGE_SIZE,
  });
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    SCRIPTS_FRAGMENT,
    root as relayItemsScripts_query$key,
  );
  const items = useMemo(
    () =>
      (data.scripts?.edges ?? []).flatMap(e => {
        // Raw db id, decoded from the global `id` (`base64("Script:<rawId>")`);
        // that's what the backend's SCRIPT context resolver + `@script:<id>` marker
        // expect. The chip re-encodes it to a global id for its `script(id:)` fetch
        // (see relay-mention-chips). Drop any edge we can't decode to a raw id — a
        // global id stored here would misroute the chip to the legacy Tactical
        // resolver (its id-shape dispatch treats non-24-hex as a Tactical id).
        const rawId = e?.node ? decodeGlobalId(e.node.id)?.rawId : null;
        if (!e?.node || !rawId) return [];
        return [
          {
            type: CONTEXT_ENTITY_KIND.SCRIPT,
            id: rawId,
            label: e.node.name || rawId,
            description: e.node.description ?? undefined,
          },
        ];
      }),
    [data],
  );
  return (
    <ContextItemsList
      items={items}
      selectedKeys={selectedKeys}
      onToggle={onToggle}
      atLimit={atLimit}
      hasMore={hasNext}
      onLoadMore={() => loadNext(MINGO_CONTEXT_PAGE_SIZE)}
      loadingMore={isLoadingNext}
      emptyLabel="No scripts"
    />
  );
}
