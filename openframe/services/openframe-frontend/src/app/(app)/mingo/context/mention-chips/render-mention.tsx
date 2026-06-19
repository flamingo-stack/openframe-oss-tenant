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
 * script, ticket) via `RestMentionChip`. Every chip falls back to a plain id
 * chip (clickable where a route exists) if its fetch can't resolve a name.
 * Unknown marker → bare token.
 */

import type { ReactNode } from 'react';
import { MINGO_CONTEXT_ENTITY_TYPES } from '../context-sources';
import { CONTEXT_ENTITY_MARKER as M } from '../context-types';
import { DeviceMentionChip, KbMentionChip, OrganizationMentionChip } from './relay-mention-chips';
import { RestMentionChip } from './rest-mention-chips';

/** marker → lead icon, taken from the picker's entity-type config. */
const ICON_BY_MARKER = new Map<string, ReactNode>(
  MINGO_CONTEXT_ENTITY_TYPES.flatMap(t => (t.marker ? [[t.marker, t.icon] as const] : [])),
);

export function renderMingoMention({ marker, id }: { marker: string; id: string }): ReactNode {
  const icon = ICON_BY_MARKER.get(marker);
  switch (marker) {
    case M.DEVICE:
      return <DeviceMentionChip id={id} icon={icon} />;
    case M.ORGANIZATION:
      return <OrganizationMentionChip id={id} icon={icon} />;
    case M.KB_ARTICLE:
      return <KbMentionChip id={id} icon={icon} />;
    case M.POLICY:
    case M.QUERY:
    case M.USER:
    case M.SCRIPT:
    case M.TICKET:
      return <RestMentionChip marker={marker} id={id} icon={icon} />;
    default:
      // Unknown marker → let the lib render the bare `@marker:id` token.
      return null;
  }
}
