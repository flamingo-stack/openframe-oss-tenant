'use client';

/**
 * HelpCenterRuntimeProvider — a NESTED `ChatRuntime` override for the
 * `/help-center` subtree.
 *
 * The app-wide `OpenframeChatRuntimeProvider` runs in `navigation.mode: 'embed'`
 * and sends every content card OUT to flamingo.run, because the app hosts none
 * of that content in-app. Help Center DOES host two of those surfaces in-app
 * (onboarding-guide + product-release detail routes), so for this subtree only
 * we flip to `mode: 'host'` (in-app soft-nav via the registered Next-router
 * embed-shims) and supply a `composeContentUrl` that:
 *   - returns relative `/help-center/...` hrefs for the types we host, and
 *   - deep-links roadmap/delivery items into their list route (`?search=<id>`),
 *   - falls back to the flamingo content hub for everything else.
 *
 * It spreads the parent runtime so chat-side config (endpoints / auth source /
 * imageProxy) is preserved — only navigation + the content-href seam change.
 */

import {
  type ChatRuntime,
  ChatRuntimeContext,
  EndpointsRuntimeContext,
} from '@flamingo-stack/openframe-frontend-core/contexts';
import {
  DEFAULT_CONTENT_SUFFIXES,
  DEV_SECTION_PARAM_KEYS,
  makeComposeContentUrl,
} from '@flamingo-stack/openframe-frontend-core/utils';
import { notFound } from 'next/navigation';
import { type ReactNode, useContext, useMemo } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { HELP_CENTER_BASE, HELP_CENTER_ENDPOINTS } from './endpoints';

// NOTE: the lib `PageShell`'s padding is overridden with OpenFrame's host grid
// spacing via the `--page-shell-*` CSS vars set on the section wrapper in
// `layout.tsx` (cascade-scoped to this subtree) — no JS, no per-page prop.

// NOTE: content-fetch auth needs NO wiring here. The lib's content surfaces route
// through `contentFetch`, which reuses the SAME EmbedAuthAdapter the chat registers
// (`openframe-chat-runtime-provider.tsx`) — so `/content/api/*` GET/POSTs carry the
// same bearer + 401-refresh as the chat with zero help-center-specific setup.

/** Public origin of the Flamingo content hub — fallback for content types Help
 *  Center does NOT host in-app (blog / podcast / case-study / …). */
const CONTENT_HUB_ORIGIN = 'https://www.flamingo.run';

/** Types Help Center hosts on its own slugged detail routes → relative in-app
 *  href `/<suffix>/<slug>` (soft-nav). The list-filter types (roadmap, delivery)
 *  are NOT here — they have no detail route and use `overrides` instead. */
const HOSTED_TYPES = new Set(['onboarding_guide', 'product_release']);

const HC = HELP_CENTER_BASE.replace(/^\//, ''); // 'help-center' (suffixes are slash-less)

export function HelpCenterRuntimeProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ChatRuntimeContext);

  const runtime = useMemo<ChatRuntime>(
    () => ({
      ...(parent as ChatRuntime),
      navigation: { mode: 'host' },
      composeContentUrl: makeComposeContentUrl({
        hostedTypes: HOSTED_TYPES,
        // Prefix the two hosted types' suffixes with the section base so their
        // in-app href is `/help-center/onboarding-guides/<slug>` etc.; keep the
        // lib defaults for every other type (used with `contentOrigin` below).
        suffixes: {
          ...DEFAULT_CONTENT_SUFFIXES,
          onboarding_guide: `${HC}/onboarding-guides`,
          product_release: `${HC}/releases`,
        },
        contentOrigin: CONTENT_HUB_ORIGIN,
        // List-filter types deep-link into their EXISTING in-app list route with
        // the `?search=<id>` param `DevSectionView` writes and the views read.
        overrides: {
          roadmap_item: id => ({
            href: `${HELP_CENTER_BASE}/roadmap?${DEV_SECTION_PARAM_KEYS.search}=${encodeURIComponent(id)}`,
            targetPlatform: null,
          }),
          delivery_item: id => ({
            href: `${HELP_CENTER_BASE}/bug-fixes-and-enhancements?${DEV_SECTION_PARAM_KEYS.search}=${encodeURIComponent(id)}`,
            targetPlatform: null,
          }),
        },
      }),
    }),
    [parent],
  );

  // Help Center is gated behind the `help-center` feature flag. This client
  // boundary wraps every `/help-center/*` route (mounted from the section
  // `layout.tsx`), so guarding here closes the whole subtree in one place —
  // no per-page check. Hooks above run unconditionally; the guard sits before
  // the render to satisfy the rules-of-hooks. (Mirrors the `knowledge-base`
  // page's `notFound()` gate.)
  if (!featureFlags.helpCenter.enabled()) {
    notFound();
  }

  // EndpointsRuntime: the authed ticket create form wraps the lib `<ContactForm>`,
  // which calls `useRequiredEndpointsRuntime()` unconditionally — so this provider
  // must wrap the subtree or the form throws once identity resolves to a session.
  // (`HELP_CENTER_ENDPOINTS` is a stable module constant; no memo needed.)
  return (
    <EndpointsRuntimeContext.Provider value={HELP_CENTER_ENDPOINTS}>
      <ChatRuntimeContext.Provider value={runtime}>{children}</ChatRuntimeContext.Provider>
    </EndpointsRuntimeContext.Provider>
  );
}
