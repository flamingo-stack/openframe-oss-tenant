/**
 * Mingo entity-context types shared across the host's context layer (the
 * picker config, the recent-views store, and the send payload).
 *
 * The backend message payload (POST /chat/api/v1/messages) carries context as
 * `{ type, id }` pairs — see `ContextRef`. The picker/store keep a `label`
 * alongside for display (chips + the dev window); the label is stripped when
 * building the wire payload.
 *
 * `CONTEXT_ENTITY_KIND` originally mirrored the `ContextItemReference.type`
 * enum in the chat service's OpenAPI contract (`GET /chat/v3/api-docs`) —
 * DEVICE / SCRIPT / TICKET / ORGANIZATION / USER / KB_ARTICLE. POLICY and QUERY
 * were added later on product request (Figma 31:28708 lists them). ⚠️ As of the
 * last verified spec the backend enum did NOT include POLICY/QUERY, so sending
 * a message whose `contextItems[].type` is POLICY/QUERY may be rejected by
 * `POST /chat/api/v1/messages` until the backend enum is extended. They are
 * searchable/selectable in the picker regardless.
 *
 * SINGLE SOURCE OF TRUTH — to add a kind: add one entry here, then wire its
 * label/icon in `MINGO_CONTEXT_ENTITY_TYPES` and its fetcher in `FETCHERS`
 * (both in `context-sources.tsx`). The TS `Record<ContextEntityKind, …>` on
 * `FETCHERS` makes a missing fetcher a compile error.
 */

export const CONTEXT_ENTITY_KIND = {
  DEVICE: 'DEVICE',
  SCRIPT: 'SCRIPT',
  TICKET: 'TICKET',
  ORGANIZATION: 'ORGANIZATION',
  USER: 'USER',
  KB_ARTICLE: 'KB_ARTICLE',
  POLICY: 'POLICY',
  QUERY: 'QUERY',
} as const;

export type ContextEntityKind = (typeof CONTEXT_ENTITY_KIND)[keyof typeof CONTEXT_ENTITY_KIND];

/** All kinds as a runtime list, in declaration order. */
export const CONTEXT_ENTITY_KINDS = Object.values(CONTEXT_ENTITY_KIND) as ContextEntityKind[];

/** Minimal wire shape for `contextItems` / `currentView` / `recentViews`. */
export interface ContextRef {
  type: ContextEntityKind;
  id: string;
}

/** A context ref enriched with display metadata (label + optional secondary
 *  line). Persisted in the recent-views store and rendered in the dev window. */
export interface ContextRefWithLabel extends ContextRef {
  label: string;
  description?: string;
}

/** Limits from the spec. */
export const CONTEXT_ITEMS_MAX = 10;
export const RECENT_VIEWS_MAX = 5;
