/**
 * Mingo entity-context types shared across the host's context layer (the
 * picker config, the recent-views store, and the send payload).
 *
 * The backend message payload (POST /chat/api/v1/messages) carries context as
 * `{ type, id }` pairs — see `ContextRef`. The picker/store keep a `label`
 * alongside for display (chips + the dev window); the label is stripped when
 * building the wire payload.
 *
 * `CONTEXT_ENTITY_KIND` mirrors the backend `ContextItemType` enum
 * (`com.openframe.data.document.chat.ContextItemType`) — DEVICE / SCRIPT /
 * TICKET / ORGANIZATION / USER / KB_ARTICLE / POLICY / QUERY. All eight are
 * resolved server-side (the ai-agent ships a `*ContextResolver` for each, incl.
 * `PolicyContextResolver` + `ScheduledQueryContextResolver`).
 *
 * `CONTEXT_ENTITY_MARKER` maps each kind to that enum's `marker()` — the SHORT
 * token the backend uses for inline `@marker:id` mentions (note `KB_ARTICLE` →
 * `kb`, not `kb_article`). The structured `contextItems[].type` wire field keeps
 * the UPPERCASE kind (Jackson deserializes the enum by name); only the inline
 * `@`-mention token in the message text uses the marker. The picker forwards the
 * marker to the lib via `ChatContextEntityType.marker`, the single mapper that
 * brings every mention to the backend's short form.
 *
 * SINGLE SOURCE OF TRUTH — to add a kind: add one entry here (+ its marker),
 * then wire its label/icon in `MINGO_CONTEXT_ENTITY_TYPES` and its fetcher in
 * `FETCHERS` (both in `context-sources.tsx`). The TS `Record<ContextEntityKind,
 * …>` on `FETCHERS` + `CONTEXT_ENTITY_MARKER` makes a missing entry a compile
 * error.
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

/**
 * Backend mention markers — each kind's `ContextItemType.marker()`. This is the
 * single mapper that reduces every `@`-mention to the backend's short form
 * (`@device:…`, `@kb:…`, `@policy:…`). `KB_ARTICLE → 'kb'` is the only entry that
 * isn't a plain lowercase of the kind. Fed to the lib via the picker so the
 * committed inline token matches the backend's `MentionParser`.
 */
export const CONTEXT_ENTITY_MARKER: Record<ContextEntityKind, string> = {
  DEVICE: 'device',
  SCRIPT: 'script',
  TICKET: 'ticket',
  ORGANIZATION: 'organization',
  USER: 'user',
  KB_ARTICLE: 'kb',
  POLICY: 'policy',
  QUERY: 'query',
};

/**
 * Relay `__typename` for the GraphQL-resolvable kinds. Used ONLY to round-trip a
 * raw db id back to a Relay global id (`base64("<typename>:<rawId>")`, see
 * `@/lib/relay-id`) right before a client-side `node(id:)` fetch in the chips.
 *
 * TEMPORARY (intentional hack): mentions AND contextItems carry RAW database ids
 * — that's what the backend context resolvers / `@marker:id` parser expect, and
 * what we store + send on the wire. But Relay's store is keyed by GLOBAL id, so
 * each chip must re-encode the raw id before fetching. On the way IN (manual
 * context-add in the picker) we do the inverse: take the GraphQL node's global
 * `id`, `decodeGlobalId` it, and store the decoded raw id. This typename map
 * never leaves the client. The remaining REST kinds (user/policy/query/ticket)
 * resolve via their own REST fetchers and have NO entry here. Drop this whole
 * dance once the backend speaks global ids end-to-end for context.
 */
export const CONTEXT_RELAY_TYPENAME: Partial<Record<ContextEntityKind, string>> = {
  DEVICE: 'Machine',
  ORGANIZATION: 'Organization',
  KB_ARTICLE: 'KnowledgeBaseItem',
  SCRIPT: 'Script',
};

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
