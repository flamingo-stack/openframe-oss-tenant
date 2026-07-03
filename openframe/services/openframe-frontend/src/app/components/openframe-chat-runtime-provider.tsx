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
 * lands on the real page on the hub instead of 404-ing in-app. The in-app
 * entity cards openframe DOES host (tickets / FAQ, via `composeContentUrl`)
 * are emitted as same-origin absolute URLs and soft-nav in-app; the `navigate`
 * hook below handles the same-PAGE deep-link cases a plain router push can't
 * (a hash for FAQ, a `?ticket=` query for tickets).
 */

/** Public origin of the Flamingo content hub where the chat's content
 *  entity-card pages (blog / roadmap / case-studies / podcasts / …) actually
 *  live. Relative card hrefs are absolutized against this in embed mode. */
const CONTENT_HUB_ORIGIN = 'https://www.flamingo.run';

import { type ChatRuntime, ChatRuntimeContext } from '@flamingo-stack/openframe-frontend-core/contexts';
import {
  buildListUrl as buildEntityCardListUrl,
  clearEmbedProxyAuth,
  type EmbedAuthAdapter,
  setEmbedAuthAdapter,
} from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { composeOpenframeChatContentUrl } from '@/app/(app)/help-center/help-center-content-href';
import { getAccessTokenSync, isBearerAuthMode } from '@/lib/token-store';

/**
 * Content-href seam for the openframe embedder. The type→route map is shared
 * with the Help Center pages (single source of truth in
 * `help-center-content-href.ts`): the FOUR types openframe hosts in-app
 * (product release / onboarding guide / roadmap / delivery) resolve to
 * `/help-center/...` ABSOLUTE same-origin URLs — so the lib's embed-mode nav
 * recognizes them as in-app and soft-navs there instead of bouncing the card
 * out to the hub. Every other type (blog / podcast / case-study / …) still
 * opens OUT to its RAG-authoritative `externalUrl` on the content hub.
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
        // embed mode). The same-tab cases we DO own are same-PAGE deep-links —
        // see `navigate` below.
        mode: 'embed',
        defaultContentOrigin: CONTENT_HUB_ORIGIN,
        // Same-PAGE deep-links — a card clicked while ALREADY on its target page:
        //   - FAQ  → `/help-center/faqs#faq-item-<id>`   (hash deep-link)
        //   - ticket → `/help-center/tickets?ticket=<id>` (query deep-link)
        // The lib's same-tab fallback router-pushes the same pathname, which
        // neither emits a `hashchange` (the FAQ page expands+scrolls on it) nor
        // re-opens the ticket drawer the tickets page derives from `?ticket=`. So
        // drive each page's own re-sync here: the query via the real router (the
        // same `replace` the ticket list's row-click uses) so `useSearchParams`
        // re-derives, and the hash via `location.hash` so `hashchange` fires.
        // Cross-page / hub links return false → the lib's default nav is unchanged.
        navigate: ({ href }) => {
          if (typeof window === 'undefined') return false;
          let url: URL;
          try {
            url = new URL(href, window.location.origin);
          } catch {
            return false;
          }
          const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;
          if (!samePage) return false;
          const hashChanged = url.hash !== window.location.hash;
          const searchChanged = url.search !== window.location.search;
          if (!hashChanged && !searchChanged) {
            // Re-clicking the same target — re-fire the hash event so a hash page
            // re-runs its scroll/open (a query page is already in the right state).
            if (url.hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
            return true;
          }
          // Query deep-link (e.g. `?ticket=<id>`) → real router so the page's
          // `useSearchParams` re-derives the open drawer (matches its row-click).
          if (searchChanged) {
            router.replace(`${url.pathname}${url.search}`, { scroll: false });
          }
          // Hash deep-link (e.g. `#faq-item-<id>`) → a router nav to the same
          // pathname emits no `hashchange`, which the page listens for; set it.
          if (hashChanged) {
            window.location.hash = url.hash;
          }
          return true;
        },
      },
      // Unified content-href seam (shared with Help Center pages): the four
      // in-app-hosted types soft-nav into `/help-center/...`; every other type
      // opens OUT to its hub home. See `composeOpenframeChatContentUrl`.
      composeContentUrl: composeOpenframeChatContentUrl,
      source: CHAT_SOURCE,
    };
    // `router` is the only reactive dep; Next returns a stable instance, so the
    // runtime object is effectively built once.
  }, [router]);

  return <ChatRuntimeContext.Provider value={runtime}>{children}</ChatRuntimeContext.Provider>;
}
