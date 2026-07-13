'use client';
import { routes } from '@/lib/routes';

/**
 * Self-fetching mention chips for the GraphQL-resolvable entity types (device,
 * organization, kb article) — the `@marker:id` analogue of `[card://]` entity
 * cards. Each suspends on first fetch (→ skeleton), reads from the Relay store
 * on streaming remounts (`store-or-network`, no flash), and falls back to a
 * plain id chip on error / unresolved name.
 *
 * id semantics (TEMPORARY HACK — see `CONTEXT_RELAY_TYPENAME` in context-types):
 * mentions AND context items carry the RAW db id (machineId / organizationId /
 * kb id), never the Relay global id. Relay's store is keyed by GLOBAL id, so we
 * re-encode the raw id to `base64("<Typename>:<rawId>")` (via `@/lib/relay-id`)
 * before fetching. Drop this once the backend speaks global ids end-to-end.
 *
 * Three fetch paths, because the backend `node(id:)` resolver only knows the
 * types in its `NodeType` enum:
 *   - device + organization → `node(id:)` (Machine / Organization ARE in the
 *     enum). Detail-page href uses the RAW id (the route segment those pages
 *     expect).
 *   - kb article            → `knowledgeBaseItem(id:)` (KnowledgeBaseItem is NOT
 *     in `NodeType` → `node(id:)` throws "Unknown Node type"). This query takes a
 *     GLOBAL id (server decodes it), and the KB detail route ALSO keys on the
 *     global id — so both the fetch AND the href use `globalId`, not the raw id.
 *   - script                → `script(id:)` (dedicated query, takes a GLOBAL id;
 *     the v2 `/scripts-v2/details/<globalId>` route ALSO keys on the global id) —
 *     so, like kb, both the fetch AND the href use `globalId`.
 */

import { type ReactNode, Suspense } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { relayMentionChipsKbQuery } from '@/__generated__/relayMentionChipsKbQuery.graphql';
import type { relayMentionChipsNodeQuery } from '@/__generated__/relayMentionChipsNodeQuery.graphql';
import type { relayMentionChipsScriptQuery } from '@/__generated__/relayMentionChipsScriptQuery.graphql';
import { ensureGlobalIdForType } from '@/lib/relay-id';
import { CONTEXT_ENTITY_KIND, CONTEXT_RELAY_TYPENAME, type ContextEntityKind } from '../context-types';
import { MentionErrorBoundary, MentionTag, MentionTagSkeleton } from './mention-tag';

interface GraphqlMentionChipProps {
  /** GraphQL-resolvable kind — DEVICE | ORGANIZATION | KB_ARTICLE | SCRIPT. */
  kind: ContextEntityKind;
  /** RAW db id (machineId / organizationId / kb id / script id). */
  id: string;
  icon?: ReactNode;
  /** Known display name (e.g. a context item's picked label). Shown instead of
   *  the bare `id` when the live fetch can't resolve a name. */
  fallbackLabel?: string;
}

/** device + organization — both are in the backend `NodeType` enum. */
const NODE_QUERY = graphql`
  query relayMentionChipsNodeQuery($id: ID!) {
    node(id: $id) {
      __typename
      ... on Machine {
        hostname
        displayName
      }
      ... on Organization {
        name
      }
    }
  }
`;

/** kb article — NOT in `NodeType`, so it can't go through `node(id:)`. */
const KB_QUERY = graphql`
  query relayMentionChipsKbQuery($id: ID!) {
    knowledgeBaseItem(id: $id) {
      name
    }
  }
`;

/** script — dedicated `script(id:)` query (takes a GLOBAL id, server decodes). */
const SCRIPT_QUERY = graphql`
  query relayMentionChipsScriptQuery($id: ID!) {
    script(id: $id) {
      name
    }
  }
`;

/** Detail-page URL for a resolved entity. Device/org routes key on the RAW id;
 *  the kb + script routes key on the GLOBAL id (same id their queries take). */
function hrefFor(kind: ContextEntityKind, rawId: string, globalId: string): string | undefined {
  switch (kind) {
    case CONTEXT_ENTITY_KIND.DEVICE:
      return routes.devices.details(rawId);
    case CONTEXT_ENTITY_KIND.ORGANIZATION:
      return routes.customers.details(rawId);
    case CONTEXT_ENTITY_KIND.KB_ARTICLE:
      return routes.knowledgeBase.details(globalId);
    case CONTEXT_ENTITY_KIND.SCRIPT:
      return routes.scriptsV2.details(globalId);
    default:
      return undefined;
  }
}

type InnerProps = GraphqlMentionChipProps & { globalId: string };

function NodeInner({ kind, id, icon, globalId, fallbackLabel }: InnerProps) {
  const data = useLazyLoadQuery<relayMentionChipsNodeQuery>(
    NODE_QUERY,
    { id: globalId },
    { fetchPolicy: 'store-or-network' },
  );
  const node = data.node;
  let label = fallbackLabel || id;
  if (node) {
    switch (node.__typename) {
      case 'Machine':
        label = node.displayName || node.hostname || label;
        break;
      case 'Organization':
        label = node.name || label;
        break;
    }
  }
  return <MentionTag icon={icon} label={label} href={hrefFor(kind, id, globalId)} />;
}

function KbInner({ kind, id, icon, globalId, fallbackLabel }: InnerProps) {
  const data = useLazyLoadQuery<relayMentionChipsKbQuery>(
    KB_QUERY,
    { id: globalId },
    { fetchPolicy: 'store-or-network' },
  );
  return (
    <MentionTag
      icon={icon}
      label={data.knowledgeBaseItem?.name || fallbackLabel || id}
      href={hrefFor(kind, id, globalId)}
    />
  );
}

function ScriptInner({ kind, id, icon, globalId, fallbackLabel }: InnerProps) {
  const data = useLazyLoadQuery<relayMentionChipsScriptQuery>(
    SCRIPT_QUERY,
    { id: globalId },
    { fetchPolicy: 'store-or-network' },
  );
  return <MentionTag icon={icon} label={data.script?.name || fallbackLabel || id} href={hrefFor(kind, id, globalId)} />;
}

function innerFor(kind: ContextEntityKind): (p: InnerProps) => ReactNode {
  switch (kind) {
    case CONTEXT_ENTITY_KIND.KB_ARTICLE:
      return KbInner;
    case CONTEXT_ENTITY_KIND.SCRIPT:
      return ScriptInner;
    default:
      return NodeInner;
  }
}

export function GraphqlMentionChip({ kind, id, icon, fallbackLabel }: GraphqlMentionChipProps) {
  const typename = CONTEXT_RELAY_TYPENAME[kind];
  // No relay typename for this kind → can't build a global id; render a plain
  // (clickable where a route exists) chip. Should not happen for the four
  // GraphQL kinds.
  if (!typename) return <MentionTag icon={icon} label={fallbackLabel || id} href={hrefFor(kind, id, id)} />;
  // `id` may be a RAW db id (context item) OR an already-global id (an inline
  // `@kb:<globalId>` mention, since KB's idHint == the node id). `ensure…`
  // encodes the former and passes the latter through unchanged — no double-encode.
  // `toGlobalId` emits the backend's unpadded form, so this global id is URL-safe
  // for the kb/script detail hrefs (`/scripts-v2/details/<globalId>`).
  const globalId = ensureGlobalIdForType(typename, id);
  const Inner = innerFor(kind);
  return (
    <MentionErrorBoundary
      fallback={<MentionTag icon={icon} label={fallbackLabel || id} href={hrefFor(kind, id, globalId)} />}
    >
      <Suspense fallback={<MentionTagSkeleton icon={icon} />}>
        <Inner kind={kind} id={id} icon={icon} globalId={globalId} fallbackLabel={fallbackLabel} />
      </Suspense>
    </MentionErrorBoundary>
  );
}
