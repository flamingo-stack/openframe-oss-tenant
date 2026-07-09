'use client';

/**
 * SINGLE SOURCE OF TRUTH for "where does a content entity card go in OpenFrame".
 *
 * OpenFrame hosts FOUR of the hub's content types in-app under `/help-center`
 * (product releases, onboarding guides, roadmap, delivery/bug-fixes); every
 * other type (blog / podcast / case-study / …) lives only on the Flamingo
 * content hub. This module encodes that split ONCE so both runtimes agree:
 *
 *   - `HelpCenterRuntimeProvider` (the `/help-center` subtree, `mode: 'host'`)
 *     uses the relative composer directly — same-origin relative hrefs soft-nav.
 *   - `OpenframeChatRuntimeProvider` (the app-wide Guide/Mingo chat drawer,
 *     `mode: 'embed'`) wraps it: in-app `/help-center/...` hrefs are absolutized
 *     to the CURRENT origin so the lib's embed-mode nav recognizes them as
 *     same-origin in-app and soft-navs there instead of bouncing every card out
 *     to the hub. Non-hosted types still resolve to their authoritative hub URL.
 *
 * Keeping the type→route map in one place means a newly in-app-hosted content
 * type becomes internal in BOTH the pages and the chat from a single edit.
 */

import {
  type ComposeContentUrl,
  DEFAULT_CONTENT_SUFFIXES,
  DEV_SECTION_PARAM_KEYS,
  faqItemAnchor,
  makeComposeContentUrl,
} from '@flamingo-stack/openframe-frontend-core/utils';
import { HELP_CENTER_BASE } from './endpoints';

/** Public origin of the Flamingo content hub — fallback for content types Help
 *  Center does NOT host in-app (blog / podcast / case-study / …). */
const CONTENT_HUB_ORIGIN = 'https://www.flamingo.run';

/** Slash-less section base (`'help-center'`) — content suffixes are slash-less. */
const HC = HELP_CENTER_BASE.replace(/^\//, '');

/** Types Help Center hosts on its own slugged detail routes → relative in-app
 *  href `/<suffix>/<slug>` (soft-nav). The list-filter types (roadmap, delivery)
 *  are NOT here — they have no detail route and use `overrides` instead. */
const HOSTED_TYPES = new Set(['onboarding_guide', 'product_release']);

/** In-app href for a HubSpot-ticket card → the Help Center tickets list with the
 *  ticket pre-opened. `?ticket=<external_id>` is the deep-link param `HelpCenterList`
 *  reads to auto-open that ticket's drawer (the same id the hub URL used). Shared
 *  by every `hubspot_ticket*` override. */
const helpCenterTicketHref = (id: string): { href: string; targetPlatform: string | null } => ({
  href: `${HELP_CENTER_BASE}/tickets?ticket=${encodeURIComponent(id)}`,
  targetPlatform: null,
});

/**
 * The unified `composeContentUrl` for OpenFrame. Returns RELATIVE in-app hrefs
 * for the four hosted types and the hub URL for everything else — exactly what
 * the `host`-mode help-center subtree needs. The chat wraps this via
 * {@link composeOpenframeChatContentUrl} to force non-hosted hrefs absolute.
 */
export const composeOpenframeContentUrl: ComposeContentUrl = makeComposeContentUrl({
  hostedTypes: HOSTED_TYPES,
  // Prefix the two hosted types' suffixes with the section base so their in-app
  // href is `/help-center/onboarding-guides/<slug>` etc.; keep the lib defaults
  // for every other type (used with `contentOrigin` for non-hosted fallback).
  suffixes: {
    ...DEFAULT_CONTENT_SUFFIXES,
    onboarding_guide: `${HC}/onboarding-guides`,
    product_release: `${HC}/releases`,
  },
  contentOrigin: CONTENT_HUB_ORIGIN,
  // List-filter types deep-link into their EXISTING in-app list route with the
  // `?search=<id>` param `DevSectionView` writes and the views read.
  overrides: {
    roadmap_item: id => ({
      href: `${HELP_CENTER_BASE}/roadmap?${DEV_SECTION_PARAM_KEYS.search}=${encodeURIComponent(id)}`,
      targetPlatform: null,
    }),
    delivery_item: id => ({
      href: `${HELP_CENTER_BASE}/bug-fixes-and-enhancements?${DEV_SECTION_PARAM_KEYS.search}=${encodeURIComponent(id)}`,
      targetPlatform: null,
    }),
    // Mingo entity cards with a real in-app destination → soft-nav in the chat
    // (and same-origin nav on the pages) instead of bouncing to the content hub.
    // A HubSpot-ticket card opens the Help Center tickets list with that ticket
    // pre-opened (every variant the RAG can emit); a FAQ card deep-links to its
    // specific question via the `#faq-item-<id>` hash the FAQ page dispatches on
    // (same anchor the hub uses) — `faqItemAnchor` is the lib's SSOT for it. Both
    // live under `/help-center`, so `isInAppHelpCenterHref` already covers them.
    hubspot_ticket: helpCenterTicketHref,
    hubspot_ticket_anon: helpCenterTicketHref,
    hubspot_ticket_self: helpCenterTicketHref,
    faq: id => ({ href: `${HELP_CENTER_BASE}/faqs#${faqItemAnchor(id)}`, targetPlatform: null }),
  },
});

/** True when a composed href points at an in-app `/help-center` route (i.e. the
 *  relative-same-origin branch of {@link composeOpenframeContentUrl}). Every
 *  in-app target — content detail routes, the roadmap/delivery list filters, the
 *  ticket list, the FAQ list — lives under `/help-center`. */
export function isInAppHelpCenterHref(href: string): boolean {
  return href === HELP_CENTER_BASE || href.startsWith(`${HELP_CENTER_BASE}/`);
}

/** True when `href` is already absolute (`https://…` or protocol-relative `//…`). */
function isAbsoluteHref(href: string): boolean {
  return /^(?:https?:)?\/\//i.test(href);
}

/**
 * Force a hub-owned href onto the content-hub origin. The RAG can hand back a
 * RELATIVE `externalUrl` for content we do NOT host (observed: webinar
 * `externalUrl: 'webinars/<id>'`). openframe runs the chat in `host` mode
 * (identical to the hub), so a relative href would resolve against OUR origin and
 * 404 — the hub gets away with relative hrefs only because it hosts every content
 * type. We host just the `/help-center/*` subset, so every OTHER type must be an
 * ABSOLUTE hub URL to open externally. Already-absolute hrefs (incl. cross-platform
 * ones like an openmsp podcast) pass through untouched.
 */
function toHubOriginHref(href: string): string {
  if (isAbsoluteHref(href)) return href;
  return `${CONTENT_HUB_ORIGIN}/${href.replace(/^\/+/, '')}`;
}

/**
 * The chat's `composeContentUrl`, shaped for the lib's HOST-mode nav decision
 * (`decideNewTab` → `isCrossOriginUrl` origin-compare / `targetPlatform` vs our
 * `source`). Splits on what openframe hosts in-app:
 *
 *   - `/help-center/*` types → keep the href RELATIVE (+ `targetPlatform: null`).
 *     `isCrossOriginUrl('/help-center/…')` is false → SAME-tab soft-nav that the
 *     browser resolves against OUR origin. (Absolutizing to our origin would
 *     backfire: `isCrossOriginUrl` counts EVERY absolute URL as cross-origin and
 *     would force a redundant new tab.)
 *   - everything else lives on the content hub → an ABSOLUTE hub URL, and
 *     `targetPlatform: null` so the new-tab decision falls to the origin compare
 *     (cross-origin hub URL → NEW tab). We must DROP the row's `targetPlatform`
 *     here: the RAG tags openframe content `targetPlatform: 'openframe'`, which
 *     equals our `source` and would flip `decideNewTab` to same-tab → the click
 *     handler strips the origin and `router.push`es a `/webinars/<id>` path that
 *     404s on our origin (the reported bug).
 */
export const composeOpenframeChatContentUrl: ComposeContentUrl = input => {
  const resolved = composeOpenframeContentUrl(input);
  if (isInAppHelpCenterHref(resolved.href)) {
    return { href: resolved.href, targetPlatform: null };
  }
  return { href: toHubOriginHref(resolved.href), targetPlatform: null };
};
