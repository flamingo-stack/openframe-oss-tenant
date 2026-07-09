# openframe-frontend → static export (one codebase: browser + desktop + mobile)

> Execution plan for making `openframe-frontend` build as a **static SPA** behind an
> env flag, so the **same codebase** ships three ways: SSR web (today), bundled
> desktop (Tauri), and bundled mobile (Capacitor, iOS/Android, native features).
> Strategy/rationale/distribution analysis live in the desktop repo:
> `openframe-desktop/docs/native-apps-strategy.md`. This doc is the *how* for the
> frontend. Audit re-verified against the live tree on this branch.

## Decision

- **No fork, no reimplementation.** The build becomes **dual-mode** via
  `OPENFRAME_BUILD_TARGET`: unset/anything → `output: 'standalone'` (web, unchanged);
  `=export` → `output: 'export'` (static SPA for native shells).
- This branch (`feat/openframe-frontend-static-export`) does the de-SSR work, then
  **merges back to the web codebase** — web keeps shipping `standalone`, native
  shells consume the `export` build. One source of truth.
- `openframe-frontend` will later move to its **own dedicated repo**; everything
  here is written to travel cleanly when it does (no monorepo-path assumptions).

## Build modes

| Mode | Trigger | `output` | Used by | Data/auth |
|---|---|---|---|---|
| **standalone** (default) | `npm run build` | `standalone` | Web deploy (Docker) | Cookies, same-origin, SSR rewrites |
| **export** | `npm run build:export` | `export` | Capacitor mobile + Tauri desktop bundle | Bearer token, absolute gateway URLs, CORS |

`build:export` = `OPENFRAME_BUILD_TARGET=export npm run build` (reuses
`generate-enums` + `relay-compiler` + `next build`).

---

## Status on this branch

**Done (foundation — safe, web build provably unchanged):**
- [x] `next.config.mjs` dual-mode: `output`, `outputFileTracingRoot` (standalone-only),
      and `rewrites()` (standalone-only) all gate on `OPENFRAME_BUILD_TARGET`.
      Verified both modes resolve: default → `standalone` + tracing root + rewrites;
      export → `export`, neither. The default (web) path is untouched.
- [x] `build:export` npm script.
- [x] `.env.export.example` documenting build-time + shell-injected runtime env.

**Done — `npm run build:export` is GREEN (exit 0 → static site in `dist/`):**

- [x] **1. Stripped `export const dynamic = 'force-dynamic'` — 55 routes.** The root
  layout's `<Suspense fallback={<AppShellSkeleton />}>` already wraps children, so the
  `useSearchParams` consumers are covered. Standalone build confirms no regression.
- [x] **2. Async `searchParams` server pages → client** (`log-details`, `tickets/dialog`).
  The `help-center/knowledge-base/[...path]` catch-all stays a server component (now with
  `generateStaticParams`).
- [x] **3. `<PublicEnvScript />` gated to standalone** (layout.tsx, via
  `OPENFRAME_BUILD_TARGET`). The export shell injects **`window.__ENV`** before the bundle
  loads — that's the key next-runtime-env reads (`runtime-config.ts` also falls back to
  `window.process.env`). `.env.export.example` documents both.
- [x] **Metadata route** (audit miss): `robots.ts` → `export const dynamic = 'force-static'`
  (it compiles to a route handler; export needs it static).
- [x] **8. Dynamic routes → query-param (the chosen strategy).** All 27 dynamic dashboard
  pages (incl. nested `[deviceId]/{file-manager,remote-*}`, `scripts/details/[id]/run`,
  `scripts/schedules/[id]/{edit,devices}`) collapsed to static `/x?id=` pages reading
  `useSearchParams`; **97 local nav sites** rewritten to `?id=` form. Cold deep-links
  (push-tap → `/devices/details?id=123`) resolve against a static file. help-center kept
  path-based (the core lib composes those hrefs) via server `generateStaticParams`
  wrappers: `legal` enumerates `privacy`/`terms`; CMS slug routes prerender a **placeholder
  shell** because `output: export` rejects an empty param list. Output dir is **`dist/`**
  (Next honors `distDir`).
- [x] **`proxy.ts` (Next 16 middleware)** (audit miss): no action — Next *disables*
  middleware under export (build note, not an error). Client-side `RouteGuard` already
  enforces the same gating, and it's a no-op in `oss-tenant` mode anyway.

**Remaining — needed to RUN the `dist/` bundle against a tenant (NOT to build it). The
build is green; the bundle is not yet runtime-functional from a `localhost` origin.**

- [ ] **A. URL resolution: tenant host, never origin — cross-cutting (must-fix)**
  In a bundle `origin = capacitor://localhost`, so any `window.location.origin`
  base hits the device.
  - `src/lib/graphql-client.ts:13` — **hardcoded** `${window.location.origin}/api/graphql`,
    no tenant fallback → **must fix** to `runtimeEnv.tenantHostUrl() || origin`.
  - `src/lib/nats/nats-app-config.tsx` — reads `tenantHostUrl()` but verify it
    *prefers* it over origin.
  - `src/lib/relay/environment.ts`, `src/lib/api-client.ts` — already
    `tenantHost || origin`; fine **once `NEXT_PUBLIC_TENANT_HOST_URL` is injected**.
  Sweep every API/WS/GraphQL/NATS/MeshCentral base to honor the shell host.

- [ ] **B. Auth → Bearer token + gateway CORS — mostly already built**
  Cookies fail cross-origin from `localhost`. Use the existing Bearer/dev-ticket
  path (`of_access_token` in storage + `NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER`;
  api-client + relay already support it). **New (backend) work:** gateway CORS for
  the `capacitor://localhost` / `https://localhost` / `tauri://localhost` /
  `http://tauri.localhost` (Tauri on Windows) origins, and the shell injecting the
  token from Face-ID-gated secure storage.

- [ ] **C. `/content/*` embedded-chat proxy — localized**
  `src/app/components/openframe-chat-runtime-provider.tsx` relies on the `rewrites()`
  same-origin proxy (omitted under export). Switch to absolute gateway URLs + Bearer
  + CORS (the provider already has cross-origin/Bearer logic).

- [ ] **D. Native-shell SPA fallback** so cold loads of non-prerendered paths resolve
  to the app shell client-side: the help-center CMS routes (placeholder-only), and any
  future content route. Dashboard query-param routes don't need it (their `/x` page is
  statically present; the id is just a query string).

### Effort
Build-green: **done.** Remaining runtime work (A–C) + the native shell (D + env
injection + push + biometrics), plus end-to-end re-test of every data flow from a
`localhost` origin. Backend (CORS + push pipeline) is separate. **moderate.**

### Verification (run on this branch)
- `npm run build` (standalone/web) → **exit 0**; dashboard routes still dynamic (`ƒ`).
  No regression.
- `npm run build:export` → **exit 0**; static site in **`dist/`** (dashboard routes
  `Static`; `legal/{privacy,terms}` real SSG; CMS slug routes SSG with a placeholder shell).
- **Not yet verified:** serving `dist/` from a `localhost` origin against a live tenant
  (auth → dashboard → device detail → chat → cold deep-link). Gated on items A–C.

---

## Native mobile app (Capacitor) — reuse this same export build

The mobile app is a **thin Capacitor shell** that loads the `export` bundle. No
second UI codebase — it renders the same `openframe-frontend` as web and desktop.

### Wrapper: **Capacitor** (decisive: first-party push covering APNS + FCM)
- `@capacitor/push-notifications` → APNS (iOS) + FCM (Android), turnkey.
- Rich plugins supply the native features that move it out of "web wrapper" territory.

### Native features (also App-Store 4.2 ammunition)
| Feature | Plugin | Notes |
|---|---|---|
| Push (APNS + FCM) | `@capacitor/push-notifications` | Hard requirement; backend fan-out below |
| Biometric gate | `@capgo/capacitor-native-biometric` (or equiv.) | Face ID / Touch ID / Android biometric unlock |
| Camera / QR | `@capacitor/camera` + a barcode plugin | Asset / QR scanning for MSP workflows |
| Secure storage | Keychain / Keystore plugin | Holds `of_access_token`, gated by biometrics |
| Deep links | `@capacitor/app` (appUrlOpen) | Push-tap → `/x?id=…`; the query-param routes make cold deep-links resolve |
| Splash / status bar | `@capacitor/splash-screen`, `@capacitor/status-bar` | Native chrome |

### Runtime config injection (frontend side done)
Shell injects `window.__ENV = { NEXT_PUBLIC_TENANT_HOST_URL, ... }` before the
WebView loads the bundle (Capacitor: injected script / config plugin) — the global
next-runtime-env's `env()` reads. `runtime-config.ts` also falls back to
`window.process.env`. layout.tsx already omits `<PublicEnvScript />` in export mode.

### Auth on device
Native layer obtains the token (login WebView or native flow), stores it in
Keychain/Keystore behind a biometric gate, injects it so the existing Bearer path
(`of_access_token` + dev-ticket observer) authenticates GraphQL/REST/relay. Gateway
must allow the device origin via CORS (item B above).

### Push pipeline (backend — unavoidable new work)
NATS already drives in-app/foreground live updates but does **not** deliver when
backgrounded/killed; APNS/FCM fill that gap.
1. **Device-token endpoint** — store APNS/FCM token per user/device.
2. **Send service** — on notification events, fan out to **both** NATS (in-app)
   and APNS/FCM (push).
Token registration + deep-link-on-tap are **shell-side** (native posts the token
with the WebView's credentials; on tap, navigate the WebView to the in-app route)
→ keeps the frontend untouched even before bundling.

### Distribution (see strategy doc §5 for the full analysis)
**ABM Unlisted (primary) + Custom Apps via MDM** for MDM-heavy customers. **Never
Apple Enterprise (ADEP)** — cert-revocation cliff kills installed copies. Android/Play
Store is unaffected. The bundled (export) build is what makes the iOS 4.2 posture
defensible and the public store viable.

---

## Desktop reuse — DONE (2026-07-08)

The Tauri desktop app (`openframe-desktop`) now embeds this same `export` bundle
instead of loading the tenant URL. Implementation (all shell-side, zero frontend
changes):
- `scripts/build-web.sh` mirrors the mobile pipeline (`build:export` → `dist/` →
  `www/`), but env is injected at **runtime** via a Tauri initialization script
  (`window.__ENV` built from the host picked in the connect window), so one
  binary serves any instance.
- The init script also installs a Capacitor-compatible shim —
  `window.Capacitor.isNativePlatform()` + `Plugins.NativeAuth` backed by Rust
  commands (login window capturing `?devTicket=`, native header-reading ticket
  exchange, file-based token store) — so `native-shell.ts`, `native-login.ts`,
  and `token-store.ts` work on desktop unchanged.
- Verified: bundle boots in the shell, hydrates cleanly, targets the injected
  tenant host. Blocked on **gateway CORS for `tauri://localhost` (macOS/Linux)
  and `http://tauri.localhost` (Windows)** — the same item-B change as
  `capacitor://localhost` — before login/data work end-to-end.

## Sequencing

1. **Frontend export-compat (this branch):** ✅ build green — dual-mode config,
   de-SSR (items 1–3), and query-param routes are done. Remaining: items A–C (host
   resolution, Bearer, CORS, `/content`) to make the `dist/` bundle runtime-functional.
   Mergeable to the web codebase anytime (web stays `standalone`, unaffected).
2. **Mobile MVP, remote-load (parallel, de-risks push/distribution):** Capacitor
   shell at `server.url` = deployed tenant + push + Face ID + camera. Backend: token
   endpoint + send service. Validates push and ABM Unlisted mechanics before bundling.
3. **Flip to bundled:** point the same Capacitor shell at the `export` bundle. Apply
   the same bundling to desktop.
4. **Harden:** deep links, offline/error screens, signing/notarization, CI.
