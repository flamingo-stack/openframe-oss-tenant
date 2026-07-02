'use client';

/**
 * `renderMention` for `<EmbeddableChat>` — the `@marker:id` analogue of
 * `renderEntityCard` for `[card://]`. The lib parses an inline mention token and
 * calls this; we dispatch by marker to a SELF-FETCHING chip (each entity type
 * owns its own fetcher + detail-page link), mirroring how `card://` markers
 * route to per-type entity cards.
 *
 * Module-level (not a hook): it needs only the static entity-type config, so a
 * stable identity falls out for free — the lib's per-message memo relies on
 * `renderMention` keeping reference equality across streaming chunks.
 *
 * Coverage = all eight markers the agent can emit. GraphQL types (device,
 * customer, kb) resolve via Relay; REST/ai-agent types (policy, query, user,
 * ticket) via `RestMentionChip`. SCRIPT is dual-sourced — a NEW script (24-char
 * ObjectId) resolves via Relay, a LEGACY Tactical script (numeric id) via REST —
 * so both kinds of script id render regardless of the `scripts-v2` flag. Every
 * chip falls back to a plain id chip (clickable where a route exists) if its
 * fetch can't resolve a name. Unknown marker → bare token.
 */

import type { ChatContextItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import type { ReactNode } from 'react';
import { MINGO_CONTEXT_ENTITY_TYPES } from '../context-sources';
import { CONTEXT_ENTITY_KIND, type ContextEntityKind, CONTEXT_ENTITY_MARKER as M } from '../context-types';
import { GraphqlMentionChip } from './relay-mention-chips';
import { RestMentionChip } from './rest-mention-chips';

/** marker → lead icon, taken from the picker's entity-type config. */
const ICON_BY_MARKER = new Map<string, ReactNode>(
  MINGO_CONTEXT_ENTITY_TYPES.flatMap(t => (t.marker ? [[t.marker, t.icon] as const] : [])),
);

/**
 * New OpenFrame scripts carry a 24-char Mongo ObjectId raw db id; legacy Tactical
 * scripts carry a plain numeric id. Used to route a `@script:id` to the right
 * resolver (Relay vs Tactical REST) so both kinds render.
 */
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

export function renderMingoMention({
  marker,
  id,
  label,
}: {
  marker: string;
  id: string;
  /** Known display name (a context item's picked label). Inline mentions don't
   *  have one; context items do. Used as the chip's fallback so it never shows a
   *  bare id when the live resolve misses (e.g. a script id the resolver can't
   *  find, or a reloaded message whose label was stripped on the wire). */
  label?: string;
}): ReactNode {
  const icon = ICON_BY_MARKER.get(marker);
  switch (marker) {
    case M.DEVICE:
      return <GraphqlMentionChip kind={CONTEXT_ENTITY_KIND.DEVICE} id={id} icon={icon} fallbackLabel={label} />;
    case M.ORGANIZATION:
      return <GraphqlMentionChip kind={CONTEXT_ENTITY_KIND.ORGANIZATION} id={id} icon={icon} fallbackLabel={label} />;
    case M.KB_ARTICLE:
      return <GraphqlMentionChip kind={CONTEXT_ENTITY_KIND.KB_ARTICLE} id={id} icon={icon} fallbackLabel={label} />;
    case M.SCRIPT:
      // Dual-sourced, independent of the `scripts-v2` flag: a 24-char ObjectId is
      // a NEW script (Relay `script(id:)`); anything else (numeric) is a LEGACY
      // Tactical script (REST). Only the manual-add dropdown source is flag-gated.
      return OBJECT_ID_RE.test(id) ? (
        <GraphqlMentionChip kind={CONTEXT_ENTITY_KIND.SCRIPT} id={id} icon={icon} fallbackLabel={label} />
      ) : (
        <RestMentionChip marker={marker} id={id} icon={icon} fallbackLabel={label} />
      );
    case M.POLICY:
    case M.QUERY:
    case M.USER:
    case M.TICKET:
      return <RestMentionChip marker={marker} id={id} icon={icon} fallbackLabel={label} />;
    default:
      // Unknown marker → let the lib render the bare `@marker:id` token.
      return null;
  }
}

/**
 * `renderContextItem` for `<EmbeddableChat>` — renders a user's ATTACHED context
 * chip (from `contextItems`) IDENTICALLY to an inline `@marker:id` mention.
 * Bridges the structured `{ type: <KIND>, id }` shape to the marker-keyed mention
 * path: maps the stored kind to its backend marker and delegates to
 * `renderMingoMention`, so the attached chip is the same self-fetching,
 * name-resolving, linked chip. Returns null for an unknown kind → the lib falls
 * back to its default label-only pill. Module-level for a stable identity (the
 * message memo depends on it).
 */
export function renderMingoContextItem(item: ChatContextItem): ReactNode {
  const marker = M[item.type as ContextEntityKind];
  if (!marker) return null;
  // Context items carry the picked display name — pass it as the chip's fallback
  // so it shows the name immediately (and never a bare id) even if the live
  // re-fetch can't resolve. `label === id` (history with the label stripped on
  // the wire) is treated as "no label".
  const label = item.label && item.label !== item.id ? item.label : undefined;
  return renderMingoMention({ marker, id: item.id, label });
}
