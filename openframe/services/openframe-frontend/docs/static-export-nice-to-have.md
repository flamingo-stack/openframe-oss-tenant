# Static Export Migration — Nice-to-Have Follow-ups

Follow-ups identified during the post-merge review of PR #2061 (static export
migration). None of these block a release; they reduce recurrence risk of the
bug classes the migration already produced (the `?shellType` hotfix #2063, the
`backFallback` 404) and pay down duplication the route conversion introduced.

Already fixed on `main` (not listed below): the stale `backFallback` path in
`script-execution-details-view.tsx`, the legacy path-param deep-link remap in
`not-found.tsx`, the file-manager layout regex in `(app)/layout.tsx`, the
missing `NEXT_PUBLIC_MOBILE_TENANT_ID` in `.env.export.example`, the
non-existent `--ods-card` token in `globals.css`, the missing-id guards on all
seven edit pages (via the shared `useRequiredIdParam` hook in
`src/app/hooks/`), the dead `force-dynamic` remnants in `worktime` and
`scripts-v2/archived`, and the create-route alignment: every entity is now
created at a dedicated `/new` route (`customers/new`, `monitoring/policy/new`,
`monitoring/query/new` added; `scripts/create`, `scripts-v2/create`,
`scripts/schedules/create` renamed). The `?id=new` sentinel survives only as
backward-compat redirects: the edit pages (via `useRequiredIdParam`'s
`legacyNewPath`) and the monitoring details shims redirect it to `/new`, and
`not-found.tsx` maps legacy `/edit/new` path links straight to `/new`. These
compat branches can be deleted once pre-alignment links are considered expired
(they are grep-able via `legacyNewPath` and `LEGACY_RENAMED_ROUTES`).

## 1. Route-builder helpers per domain

**Problem.** The migration hand-edited ~97 navigation sites; URL literals are
still duplicated (`/devices/details?id=` appears ~18×, `/customers/details?id=`
in 6 files, monitoring/scripts similarly). Both post-merge bugs (#2063
`?id=X?shellType=bash`, the execution-details `backFallback`) were missed
literals of exactly this kind.

**Suggestion.** Extend the existing pattern —
`settings/employees/routes.ts` exports `employeeDetailHref(id)` — to the other
domains: `devices/routes.ts` (`deviceDetailHref`, `deviceFileManagerHref`,
`deviceRemoteShellHref(id, shellType)`), `customers/routes.ts`,
`scriptsV2/routes.ts`, `monitoring/routes.ts`. The next URL-shape change (hash
routing for the native shell, tenant prefixes, reverting to path params)
becomes a per-domain one-liner instead of another repo-wide sweep. Migrate the
`not-found.tsx` legacy-remap table onto the same helpers so old and new shapes
live in one file per domain.

## 2. Adopt `useRequiredIdParam` on the remaining wrapper pages

**Problem.** The shared `useRequiredIdParam(fallbackPath, legacyNewPath?)`
hook now exists in `src/app/hooks/` and guards all seven *edit* pages, but the
~13 *details* wrapper pages still hand-roll `useSearchParams().get('id')` with
divergent missing-id policies: `notFound()` (knowledge-base details/folders),
redirect (tickets/dialog, log-details), and silent `?? ''` passthrough
(devices, customers, scripts, monitoring — the detail views then fire queries
with an empty id: endless skeleton or an error toast, depending on the view).

**Suggestion.** Apply the hook to the details wrappers too (redirect-to-list
matches the old 404 semantics best) and delete the remaining duplicated
guards.

## 3. Bearer auth attachment helper in `token-store.ts`

**Problem.** `token-store.ts` centralizes token *custody*, but the 4-line
attachment stanza (`if (isBearerAuthMode()) { const t = getAccessTokenSync();
if (t) headers.Authorization = ... }`) is copy-pasted at ~8 HTTP call sites
(`api-client.ts`, `auth-api-client.ts` ×2 — one already drifted with an extra
guard, `relay/environment.ts`, `upload-with-auth.ts` ×2, chat runtime
provider), plus 3 WebSocket query-string variants (`meshcentral-control.ts`,
`meshcentral-tunnel.ts`, `use-live-campaign.ts`).

**Suggestion.** Export `getBearerAuthHeaders(): Record<string, string>` and
`appendAuthQueryParam(url: string): string` from `token-store.ts`; replace all
11 sites. Any transport change (header name, prefix, the `?`-vs-`&` separator
that already bit #2063) then lands in one file.

## 4. Native cold-start Keychain hydration race

**Problem.** `getAccessTokenSync()` returns `null` until the fire-and-forget
Keychain hydration in `NativeShellInitializer` resolves. HTTP paths recover
via 401 → refresh → retry, but that costs a full token rotation on every app
launch; the WebSocket URL builders and `uploadWithAuth` attach the token once
with no retry net, so a cold-start deep link (e.g. push → remote shell) can
open its first connection unauthenticated.

**Suggestion.** In async call paths, use the existing `getAccessToken()`
(awaits hydration; the resolved promise is free on web). For the WS builders,
`await initTokenStore()` before the first `buildUrl()`. This removes the
per-launch refresh rotation and the first-connection failure window.

## 5. Clarify the `NativeAuth.setTokens` partial-update contract

**Problem.** On an access-only rotation, `setTokens` forwards
`{ accessToken, refreshToken: undefined }` to the native plugin. The TS
interface (`native-shell.ts`) does not say whether the plugin merges or
replaces the stored pair. If it replaces, the persisted refresh token is
silently dropped — the session survives until the app is killed, then the
user is forced to re-login.

**Suggestion.** Verify the shell plugin implementation; either document
merge semantics on the interface or only include keys that are present in the
call. Add a relaunch-after-access-only-rotation test to the native smoke
checklist.

## 6. Unify logout token clearing

**Problem.** Two parallel APIs clear tokens: `auth-actions.ts` deliberately
`await`s `clearTokens()` ("must not race navigation"), while
`force-logout.ts#clearStoredTokens()` fire-and-forgets it (`void
clearTokens()`) right before `window.location.href` navigation — reintroducing
on the forced-logout path the exact race the other call site documents.
Relatedly, native sign-out awaits the revocation network call *before*
clearing local state, blocking the Sign Out tap on slow connections.

**Suggestion.** Make `forceLogout` await the clear before navigating and drop
the thin `hasStoredTokens`/`clearStoredTokens` wrappers in favor of direct
`token-store` calls. For sign-out UX: capture the refresh token, clear local
state immediately, and fire revocation in the background.

## 7. Documentation drift

- `CLAUDE.md` (frontend) still references deleted files/behavior:
  `graphql-client.ts`, `GraphQlIntrospectionInitializer` (in the provider
  stack diagram and the introspection section), and "`force-dynamic` on the
  root layout". It also omits `build:export` and `NEXT_PUBLIC_MOBILE_TENANT_ID`.
- `docs/static-export-migration.md` remaining-work item A points at
  `src/lib/graphql-client.ts`, which this same PR deleted.
- ~20 `.page.md` doc stubs were renamed out of `[id]/` directories but still
  describe the old `useParams` implementation and carry stale source hashes;
  `src/lib/.graphql-client.md` and
  `src/components/.graphql-introspection-initializer.md` document deleted
  modules and should be removed.

## 8. Export-target SPA fallback for CMS slugs

`help-center/releases/[slug]` and `onboarding-guides/[slug]` prerender only a
placeholder `index` slug in the export bundle; direct entry / push deep links
to real slugs hard-404 on a static host until the shell's SPA fallback
(migration doc item D) ships. Until then, guard `slug === 'index'` in the
client views so the placeholder page doesn't fire a guaranteed-404 API call
when crawled or mistyped.

## 9. Redirect shims for the standalone web build

`not-found.tsx` now remaps legacy path-param URLs client-side, which covers
both targets. For the standalone web build a server-side `redirects()` in
`next.config.mjs` (gated on `!isStaticExport`) would additionally return
proper 308s to crawlers and non-JS clients — cheap to add next to the
existing `rewrites()` gate.
