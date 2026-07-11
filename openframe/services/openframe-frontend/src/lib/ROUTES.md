# Route Registry (`src/lib/routes.ts`)

> **Single source of truth for every internal URL the app navigates to.**
> No page, component, hook, or table may hand-write an internal path string —
> all `router.push`/`router.replace`/`<Link href>`/`useSafeBack`/`redirect`
> targets are built through the `routes` object.

## Why it exists

Before the registry, ~80 call sites built URLs from raw string literals
(`router.push('/monitoring?tab=policies')`, `` `/devices/details/${id}` ``).
Every URL-scheme change (e.g. the dynamic-segment → `?id=` query-param
migration forced by the static-export build) meant grepping strings across
40+ files, and typos in paths or tab names surfaced only at runtime as 404s
or a silently wrong default tab.

The registry fixes that:

- **One edit per URL change.** A path lives in exactly one place; renaming a
  route is a one-line diff plus whatever the compiler flags.
- **Typed end to end.** Dynamic ids, query params, and tab names are
  type-checked. `routes.monitoring.root({ tab: 'policy' })` (typo) fails
  `tsc`; `` `/monitoring?tab=policy` `` did not.
- **Nullability surfaced.** Builders take `string | number` — passing a
  `string | null` id is a compile error, which has already caught real bugs
  where `null` was silently interpolated into a URL (`/details?id=null`).
- **Consistent query semantics.** All builders share one `withQuery()`
  helper: `undefined`/`null` params are dropped, values are URL-encoded via
  `URLSearchParams` (never call `encodeURIComponent` manually).

## Shape

```ts
import { routes } from '@/lib/routes';

// Static routes are plain strings:
routes.dashboard                    // '/dashboard'
routes.devices.list                 // '/devices'
routes.customers.new                // '/customers/new'

// Parametrized routes are functions; the options object is typed:
routes.customers.details(id)                          // /customers/details?id=<id>
routes.customers.details(id, { tab: 'tickets' })      // ...&tab=tickets
routes.devices.details(id, { action: 'runScript' })   // ...&action=runScript
routes.monitoring.root({ tab: 'policies' })           // /monitoring?tab=policies
routes.tickets.dialog(id, { tab: 'chat' })            // /tickets/dialog?id=<id>&tab=chat
```

Usage at call sites:

```tsx
router.push(routes.monitoring.policy(policy.id));
const handleBack = useSafeBack(routes.customers.list({ tab: 'archived' }));
<Link href={routes.settings.employees} />
<Button href={routes.devices.details(deviceId)} />
```

## Tab ids (`TAB_IDS`)

Pages with a `?tab=` sub-view declare their allowed tab ids in `TAB_IDS`, and
union types are derived from it (`MonitoringTab`, `DeviceDetailTab`,
`SettingsTab`, …). This is the **source of truth** shared between the route
builders and the in-page `TabItem[]` arrays — the same string can't drift
between the link that targets a tab and the page that renders it.

In-page tab *state* (reading `?tab=`, switching tabs via `useApiParams` /
`TabNavigation` / `router.replace`) is not the registry's job — the registry
only produces the URLs that point *into* a tab from elsewhere.

## URL conventions encoded in the registry

These mirror the app-router constraints (static-export build):

- **No dynamic path segments.** Detail pages take the entity id as a query
  param, always named `id`: `/customers/details?id=…`, `/monitoring/policy?id=…`.
- **Create pages are dedicated `/new` segments** (`/customers/new`,
  `/monitoring/policy/new`, `/scripts-v2/new`), not an `?id=new` sentinel.
- **Multi-param routes** compose through the options object:
  `/devices/details?id=…&tab=overview&action=runScript`.

## Maintenance rules

When you add or change a page, tab, or any component that links somewhere:

1. **New page / route** → add its entry to `routes` first, then use
   `routes.*` at every call site. Never commit a raw internal path string.
2. **New `?tab=` view on a page** → add the tab id to `TAB_IDS`, derive the
   union if it's a new page, and reference the union (or `TAB_IDS`) from the
   page's `TabItem[]` definition instead of re-typing the literals.
3. **New query param on an existing route** → extend that builder's options
   object (typed — use a literal union when the values are enumerable, e.g.
   `action?: 'runScript'`).
4. **Renaming / restructuring a URL** → change it in `routes.ts` only; the
   compiler and a grep for the old literal confirm nothing else refers to it.
5. **Nullable ids** — builders intentionally reject `null | undefined`.
   Guard at the call site (`id ? routes.x.details(id) : routes.x.list`)
   rather than widening the parameter type.

**Known exceptions** (intentional raw strings — do not "fix"):
- `src/app/not-found.tsx` — the legacy-path redirect table maps *old* URLs
  to new ones; its keys are historical strings by design.
- `pathname.startsWith('/…')` active-state checks (sidebar, guards) compare
  against path prefixes, not full routes; literals are acceptable there.
- External URLs (`https://…`, `mailto:`) and API endpoints (`/api/…`) are
  out of scope — the registry covers internal *page* navigation only.
