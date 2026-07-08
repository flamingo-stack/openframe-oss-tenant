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
 * Navigation is `mode: 'host'` — IDENTICAL to MPH's `HubRuntimeProvider`
 * (hub.openframe.ai). openframe-frontend hosts its own copy of the content the
 * chat cites (the `openframe-docs` knowledge base at `/help-center/knowledge-base`,
 * plus tickets / FAQ / releases / roadmap under `/help-center`), so it behaves as
 * the content HOST, not a cross-origin embedder. In host mode the lib leaves
 * relative hrefs untouched (they resolve against OUR origin) and defers the
 * new-tab decision to `navigation.decideNewTab`. Concretely, mirroring the hub:
 *   - `navigate`   — in-page doc-tree swap (`useDocNavigation`) → same-origin
 *                    `router.push` (with same-page-hash smoothing) → false for
 *                    cross-origin (lib opens externally).
 *   - `decideNewTab` — lib's `decideNewTab` with our `source`: same-platform /
 *                    same-origin → same tab; cross-platform / cross-origin → new tab.
 * Result: `openframe-docs` chips / cards / search results soft-nav in-app on OUR
 * origin (just like they stay on hub.openframe.ai on the hub); genuinely external
 * content (blog / podcasts / …), emitted by `composeContentUrl` as absolute hub
 * URLs, still opens in a new tab on the hub.
 */

import {
  isCrossOriginUrl,
  decideNewTab as libDecideNewTab,
  stripSameOriginToPath,
} from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useDocNavigation } from '@flamingo-stack/openframe-frontend-core/components/docs';
import { type ChatRuntime, ChatRuntimeContext } from '@flamingo-stack/openframe-frontend-core/contexts';
import {
  buildListUrl as buildEntityCardListUrl,
  clearEmbedProxyAuth,
  type EmbedAuthAdapter,
  navigateSamePageHash,
  setEmbedAuthAdapter,
} from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo } from 'react';
import { composeOpenframeChatContentUrl } from '@/app/(app)/help-center/help-center-content-href';
import { getAccessTokenSync, isBearerAuthMode } from '@/lib/token-store';

/**
 * Content-href seam for openframe. The type→route map is shared with the Help
 * Center pages (single source of truth in `help-center-content-href.ts`): the
 * FOUR types openframe hosts in-app (product release / onboarding guide /
 * roadmap / delivery) resolve to `/help-center/...` same-origin URLs — so
 * host-mode nav recognizes them as in-app and soft-navs there instead of
 * bouncing the card out to the hub. Every other type (blog / podcast /
 * case-study / …) still opens OUT to its RAG-authoritative `externalUrl` on
 * the content hub.
 */

import { refreshAccessToken } from '@/lib/token-refresh-manager';

/** Stable source identifier used for localStorage namespacing inside the
 *  lib (`mingo-chat-openframe-v1` keys). Must not change between
 *  deployments or users lose their local Guide history. Openframe is
 *  Mingo-only today, so the source value is more of a namespace label
 *  than a content discriminator. */
const CHAT_SOURCE = 'openframe' as const;

/**
 * Auth adapter the lib's `embedAuthedFetch` consults on every embedded-chat
 * request. Defined at module scope (not rebuilt per render) so it can be
 * registered SYNCHRONOUSLY on first render — before the child chat effects
 * (identity / slash-commands fire in their own mount effects, which run
 * BEFORE a parent `useEffect`). All deps it closes over are module-level.
 */
const CHAT_AUTH_ADAPTER: EmbedAuthAdapter = {
  getHeaders: () => {
    // Mirror `apiClient.getAuthHeaders()` EXACTLY: only attach a stored Bearer
    // in bearer mode (dev-ticket web or native shell). In normal cookie mode
    // the access token lives in an http-only cookie that `oauth/refresh`
    // rotates server-side; the client-side copy is only maintained in bearer
    // mode (token-refresh-manager gates its writes the same way). Sending a
    // copy outside bearer mode would ship a stale/expired Bearer that the
    // gateway prefers over the fresh cookie. Omit it and let
    // `credentials: 'include'` carry the cookie.
    if (!isBearerAuthMode()) return {};
    const token = getAccessTokenSync();
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
  const router = useRouter();
  // In-app doc-tree swap bridge — the same hook the hub wires into `navigate`.
  // When a knowledge-base viewer is mounted it swaps the doc in place; otherwise
  // its safe no-op fallback returns false and we `router.push` instead.
  const docNav = useDocNavigation();

  // Host-mode navigation callbacks — mirror MPH's `HubRuntimeProvider` so the
  // `openframe-docs` chips / cards / search results navigate identically here.
  const navigate = useCallback<NonNullable<ChatRuntime['navigation']['navigate']>>(
    ({ href, path }) => {
      // 1. In-page doc-tree swap when `path` matches a mounted viewer.
      if (path != null && docNav.navigate(path)) return true;
      // 2. Same-origin URL → soft-nav (hash targets get the smooth same-page tween
      //    + synthetic `hashchange` so FAQ auto-expand / scroll-to-hash still fire).
      if (!isCrossOriginUrl(href)) {
        const target = stripSameOriginToPath(href);
        if (!navigateSamePageHash(target)) router.push(target);
        return true;
      }
      // 3. Cross-origin → let the lib open it (new tab).
      return false;
    },
    [router, docNav],
  );

  // New-tab decision is purely ORIGIN-based, and deliberately drops the incoming
  // `targetPlatform`. Our `composeContentUrl` emits in-app content as RELATIVE
  // hrefs (`isCrossOriginUrl` → false → same tab, soft-nav on our origin) and
  // hub content as ABSOLUTE URLs (→ true → new tab). We must NOT feed
  // `targetPlatform` into the lib rule: the RAG tags every openframe row
  // `targetPlatform: 'openframe'` (== our `source`), which the lib's platform
  // branch reads as "same app → same tab" — even for hub content we don't host
  // (webinar / blog / …). That flipped a hub webinar URL to same-tab, so the click
  // handler stripped its origin and `router.push`ed `/webinars/<id>` → 404 on our
  // origin. Passing `targetPlatform: null` forces the lib onto its origin-compare
  // fallback, which is exactly right once in-app=relative / hub=absolute holds.
  const decideNewTab = useCallback<NonNullable<ChatRuntime['navigation']['decideNewTab']>>(
    ({ href }) => libDecideNewTab({ href, targetPlatform: null, currentSource: CHAT_SOURCE }),
    [],
  );

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
        // Host mode — identical to MPH's `HubRuntimeProvider`. See the file
        // header + the `navigate` / `decideNewTab` callbacks defined above.
        mode: 'host',
        navigate,
        decideNewTab,
      },
      // Unified content-href seam (shared with Help Center pages): the four
      // in-app-hosted types soft-nav into `/help-center/...`; every other type
      // opens OUT to its hub home. See `composeOpenframeChatContentUrl`.
      composeContentUrl: composeOpenframeChatContentUrl,
      source: CHAT_SOURCE,
    };
    // `navigate` / `decideNewTab` are the only reactive deps; both are stable
    // `useCallback`s, so the runtime object is effectively built once.
  }, [navigate, decideNewTab]);

  return <ChatRuntimeContext.Provider value={runtime}>{children}</ChatRuntimeContext.Provider>;
}
