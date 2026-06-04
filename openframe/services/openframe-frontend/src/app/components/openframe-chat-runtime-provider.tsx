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
    // All Guide-mode endpoints are built as absolute URLs against the
    // backend gateway (`NEXT_PUBLIC_TENANT_HOST_URL`, e.g.
    // `https://test-dev.openframe.build`). The gateway exposes the
    // `/content/*` route mapped to MPH so the lib's bare `fetch()` calls
    // land directly on the gateway with no Next.js rewrite hop.
    //
    // The lib's `embedAuthedFetch` normally rejects cross-origin URLs as
    // defense-in-depth (bearer + Supabase cookies must not leak), BUT
    // its dev-mode escape hatch (`NODE_ENV !== 'production'`) lets the
    // browser call across origins for local development. Production
    // bundles either keep the strict guard (if served cross-origin from
    // the gateway) or naturally pass it (if openframe-frontend and the
    // gateway end up on the same origin behind a single reverse proxy).
    const tenantHost = runtimeEnv.tenantHostUrl().replace(/\/+$/, '');
    const content = (path: string): string => `${tenantHost}/content${path}`;

    return {
      endpoints: {
        // Upstream paths verified live against the deployed instance
        // (2026-05-29 endpoint table).
        chatStreamUrl: content('/api/docs/chat'),
        approvalToolUrl: content('/api/chat/agent/confirm-tool'),
        commandsUrl: content('/api/docs/commands'),
        // Fetch-mode entity cards (blog, roadmap, case study, release,
        // podcast/webinar/event, …) expand their `[card://<type>:<id>]`
        // markers by GETting the type's list endpoint. The lib owns the
        // non-obvious per-type URL shapes (`task_ids` vs `ids`, `pageSize`,
        // `&filter=all`, distinct paths); we just point its builder at the
        // `/content` reverse proxy so the URLs land on MPH. Returning null
        // here (the old TODO) left every such card with no URL → no fetch →
        // blank card.
        buildListUrl: (type, ids) => buildEntityCardListUrl(type, ids, `${tenantHost}/content`),
        attachmentUploadUrl: content('/api/storage/generate-upload-url'),
        attachmentViewUrlPrefix: content('/api/storage/view/chat-attachments/'),
        // SOURCE-VS-DEPLOYED GAP: MPH source has `/api/auth/identity`
        // (at `app/api/auth/identity/route.ts`). The deployed instance
        // also serves `/api/chat/identity` per the live endpoint table
        // verified 2026-05-29. We use the deployed path because it's
        // the one verified to work end-to-end; if 404, swap to
        // `/api/auth/identity`.
        identityUrl: content('/api/chat/identity'),
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
