'use client';

/**
 * OpenframeChatRuntimeProvider — supplies the `ChatRuntime` context the
 * lib's `<EmbeddableChat>` requires. Openframe-frontend exposes BOTH
 * Mingo (NATS, openframe backend) and Guide (SSE, MPH backend via the
 * `/content` proxy) modes through the in-panel toggle. The endpoint URLs
 * below cover both transports:
 *
 *   - Mingo callbacks live in `MingoEmbeddableChatEntry` and don't touch
 *     this runtime — they call `apiClient` against `/chat/*` directly.
 *   - Guide reads its endpoint URLs FROM this runtime. Each Guide path
 *     is prefixed with `/content/`; the openframe-frontend Next.js layer
 *     reverse-proxies that prefix to the MPH origin so neither the lib
 *     nor the host page learns the upstream MPH URL.
 *
 * Navigation is `mode: 'embed'`: openframe-frontend is an EMBEDDER of the
 * Flamingo content hub, not its host. The content entity cards (blog,
 * roadmap, case-studies, …) carry RELATIVE hrefs (`/blog/<slug>`) that only
 * resolve on the hub origin — those routes don't exist in openframe. Embed
 * mode makes the lib (a) absolutize every relative card/chip href against
 * `defaultContentOrigin` and (b) always open it in a new tab, so a click
 * lands on the real page on the hub instead of 404-ing in-app. Mingo emits
 * no openframe-internal links, so there's no same-tab `navigate` to wire.
 */

/** Public origin of the Flamingo content hub where the chat's content
 *  entity-card pages (blog / roadmap / case-studies / podcasts / …) actually
 *  live. Relative card hrefs are absolutized against this in embed mode. */
const CONTENT_HUB_ORIGIN = 'https://www.flamingo.run';

import { type ChatRuntime, ChatRuntimeContext } from '@flamingo-stack/openframe-frontend-core/contexts';
import {
  buildListUrl as buildEntityCardListUrl,
  type ComposeContentUrl,
  clearEmbedProxyAuth,
  DEV_SECTION_PARAM_KEYS,
  type EmbedAuthAdapter,
  setEmbedAuthAdapter,
} from '@flamingo-stack/openframe-frontend-core/utils';
import { type ReactNode, useMemo } from 'react';
import { runtimeEnv } from '@/lib/runtime-config';

/**
 * Unified content-href seam for the openframe embedder (the same `composeContentUrl`
 * the hub's own page-view cards + chat cards use). openframe hosts NONE of the hub's
 * content in-app, so every card opens OUT to its real home. Two cases:
 *
 *   1. roadmap / delivery — path DIFFERS per platform (openframe `/roadmap` vs
 *      flamingo `/roadmap-and-releases?tab=…`), so a verbatim `externalUrl` can't
 *      be trusted. Rebuild against the flamingo unified page from the item's id
 *      (mirrors `SECTION_PATH_BY_PLATFORM.flamingo` in
 *      `multi-platform-hub/lib/utils/dev-section-url.ts`). `internal_task` is NOT
 *      here — its `externalUrl` is a platform-agnostic `app.clickup.com` link.
 *   2. everything else (blog / release / case-study / podcast / …) — the
 *      RAG-authoritative `externalUrl` verbatim (already an absolute
 *      owning-platform URL), identical to the hub's own composer.
 */
const composeOpenframeContentUrl: ComposeContentUrl = ({ type, identifier, externalUrl, targetPlatform }) => {
  if (type === 'roadmap_item' || type === 'delivery_item') {
    const tab = type === 'roadmap_item' ? 'roadmap' : 'delivery';
    return {
      href: `${CONTENT_HUB_ORIGIN}/roadmap-and-releases?tab=${tab}&${DEV_SECTION_PARAM_KEYS.search}=${encodeURIComponent(identifier)}`,
      targetPlatform: null,
    };
  }
  return { href: externalUrl ?? '', targetPlatform: targetPlatform ?? null };
};

import { refreshAccessToken } from '@/lib/token-refresh-manager';

/** localStorage key the openframe `apiClient` writes/reads. Kept in sync
 *  with [api-client.ts:7](src/lib/api-client.ts#L7) — both sides MUST
 *  use the same key so the bearer is consistent. */
const ACCESS_TOKEN_KEY = 'of_access_token';

/** Stable source identifier used for localStorage namespacing inside the
 *  lib (`mingo-chat-openframe-v1` keys). Must not change between
 *  deployments or users lose their local Guide history. Openframe is
 *  Mingo-only today, so the source value is more of a namespace label
 *  than a content discriminator. */
const CHAT_SOURCE = 'openframe' as const;

/** Read `of_access_token` without throwing (sandboxed iframes can). */
function safeReadToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Auth adapter the lib's `embedAuthedFetch` consults on every embedded-chat
 * request. Defined at module scope (not rebuilt per render) so it can be
 * registered SYNCHRONOUSLY on first render — before the child chat effects
 * (identity / slash-commands fire in their own mount effects, which run
 * BEFORE a parent `useEffect`). All deps it closes over are module-level.
 */
const CHAT_AUTH_ADAPTER: EmbedAuthAdapter = {
  getHeaders: () => {
    // Mirror `apiClient.getAuthHeaders()` EXACTLY: only attach a localStorage
    // Bearer in dev-ticket mode. In normal cookie mode the access token lives
    // in an http-only cookie that `oauth/refresh` rotates server-side, while
    // the `of_access_token` localStorage copy is written ONCE at login and
    // never refreshed (token-refresh-manager gates that write on dev-ticket).
    // Sending that copy would ship a stale/expired Bearer that the gateway
    // prefers over the fresh cookie. Omit it and let `credentials: 'include'`
    // carry the cookie — same way the rest of the app authenticates.
    if (!runtimeEnv.enableDevTicketObserver()) return {};
    const token = safeReadToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  // Send openframe cookies cross-origin to the gateway; CORS +
  // `SameSite=None` on cookies must be configured server-side. (Harmless
  // no-op in production, where the frontend and gateway share one origin.)
  credentials: 'include',
  // `refreshAccessToken` already dedups concurrent refreshes internally, and
  // `embedAuthedFetch` dedups 401-triggered retries on top — so a stampede of
  // simultaneously-expiring chat requests refreshes once.
  refresh: () => refreshAccessToken(),
};

// Register the auth adapter + drop legacy proxy-auth ONCE, at module load —
// i.e. before the provider renders or any child chat effect fires a request.
// Why not in render / useEffect: the chat's identity & slash-command requests
// fire from CHILD mount effects, which run before a parent `useEffect`; and a
// `useState` initializer races StrictMode's double-invoke + the unmount-null,
// leaving the first requests adapter-less (the `credentials: 'same-origin'` +
// 401 + no-refresh symptom). The adapter is a stateless module singleton
// (reads localStorage/env fresh per call), so a single app-lifetime
// registration with no teardown is correct — and runs exactly once, so there
// is no "overwriting a previously-registered adapter" warning.
//
// `clearEmbedProxyAuth()`: openframe never does proxy-impersonation, but an
// earlier `setEmbedProxyAuth`-based approach persisted the openframe JWT under
// `<appType>.chat.proxy-auth.v1`. That copy is frozen at login, so
// `applyProxyAuth` kept attaching a stale/expired Bearer to `/content/*`.
if (typeof window !== 'undefined') {
  clearEmbedProxyAuth();
  setEmbedAuthAdapter(CHAT_AUTH_ADAPTER);
}

export function OpenframeChatRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useMemo<ChatRuntime>(() => {
    // Guide-mode endpoints are SAME-ORIGIN relative `/content/*` paths. The
    // lib's `embedAuthedFetch` rejects cross-origin URLs in production builds
    // (bearer + cookies must not leak across origins); keeping these relative
    // means the browser always calls the page origin and the guard passes in
    // every build. The Next.js `rewrites()` (see `next.config.mjs`) forwards
    // `/content/*` to the tenant gateway, and in a same-origin production
    // deployment the platform reverse proxy answers it before Next does.
    const content = (path: string): string => `/content${path}`;

    return {
      endpoints: {
        // Upstream paths verified live against the deployed instance
        // (2026-05-29 endpoint table).
        chatStreamUrl: content('/api/docs/chat'),
        approvalToolUrl: content('/api/chat/agent/confirm-tool'),
        // Help Center ticket agent endpoints — proxied under `/content` like
        // every other endpoint, so they route through the existing `/content/*`
        // rewrite (dev) + platform reverse-proxy (prod). No bare `/api/chat/agent/*`
        // hatch needed.
        findTicketUrl: content('/api/chat/agent/find-ticket'),
        ticketActionUrl: content('/api/chat/agent/ticket-action'),
        listEngagementsUrl: content('/api/chat/agent/list-engagements'),
        commandsUrl: content('/api/docs/commands'),
        // Per-platform empty-state config (greeting + try-asking quick-action
        // chips + RAG-source filter), admin-edited in MPH's `/admin/chat-config`.
        // Same-origin relative `/content/*` path (see `commandsUrl`), proxied to
        // MPH. The lib fetches it at runtime because, as a cross-origin embedder,
        // we have no SSR hop to inject these as props the way MPH's in-app chat
        // does. Drives `emptyStateGreeting` + the Guide/Mingo quick-action chips.
        emptyStateUrl: content('/api/docs/empty-state'),
        // Fetch-mode entity cards (blog, roadmap, case study, release,
        // podcast/webinar/event, …) expand their `[card://<type>:<id>]`
        // markers by GETting the type's list endpoint. The lib owns the
        // non-obvious per-type URL shapes (`task_ids` vs `ids`, `pageSize`,
        // `&filter=all`, distinct paths); we just point its builder at the
        // `/content` reverse proxy so the URLs land on MPH. Returning null
        // here (the old TODO) left every such card with no URL → no fetch →
        // blank card.
        buildListUrl: (type, ids) => buildEntityCardListUrl(type, ids, '/content'),
        attachmentUploadUrl: content('/api/storage/generate-upload-url'),
        attachmentViewUrlPrefix: content('/api/storage/view/chat-attachments/'),
        // Identity endpoint = the MPH source route `app/api/auth/identity/route.ts`
        // (served at `/api/auth/identity`, proxied here under `/content`). The
        // previously-used `/api/chat/identity` returns the content app's
        // `/_not-found` (200 HTML) on this tenant host — verified 2026-06-15 via
        // `/help-center/tickets`: the authed GET reached MPH but matched no route,
        // so `useChatIdentity` fell back to `anon` and the signed-in ticket form
        // never showed. `/api/auth/identity` is the lib's documented hub default.
        identityUrl: content('/api/auth/identity'),
        imageProxyUrlPrefix: content('/api/image-proxy'),
      },
      navigation: {
        // Embedder, not host — see the file header. Relative content-card
        // hrefs get absolutized against `defaultContentOrigin` and opened in
        // a new tab (the lib's `computeIsNewTab` short-circuits to new-tab in
        // embed mode), so there's no in-app `navigate` to wire.
        mode: 'embed',
        defaultContentOrigin: CONTENT_HUB_ORIGIN,
      },
      // Unified content-href seam: openframe hosts no hub content in-app, so
      // every card opens OUT to its real home — roadmap/delivery rebuilt against
      // the flamingo unified page, company-hub content re-based onto company-hub,
      // everything else passed through verbatim. See `composeOpenframeContentUrl`.
      composeContentUrl: composeOpenframeContentUrl,
      source: CHAT_SOURCE,
    };
  }, []);

  return <ChatRuntimeContext.Provider value={runtime}>{children}</ChatRuntimeContext.Provider>;
}
