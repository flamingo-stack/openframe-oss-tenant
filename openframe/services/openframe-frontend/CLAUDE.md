# OpenFrame Frontend - Claude Development Guide

**Next.js 16 + React 19 + TypeScript 5.8 + @flamingo-stack/openframe-frontend-core (^0.0.360)**

> Comprehensive instructions for Claude when working with the OpenFrame Frontend service.

## Core Principles

**MANDATORY REQUIREMENTS:**
1. ALL UI components MUST use `@flamingo-stack/openframe-frontend-core` — never create custom UI primitives
2. ALL styling MUST use ODS design tokens (no hardcoded colors)
3. Follow WCAG 2.1 AA accessibility standards
4. Use `react-hook-form` + `zod` for forms; use `useToast` for all API feedback
5. Use `react-relay` for GraphQL data fetching wherever possible — the codebase is gradually migrating to Relay. Use `@tanstack/react-query` for REST APIs and for legacy GraphQL code that has not been migrated yet. Do NOT introduce new raw-POST GraphQL calls.

## Setup & Commands

### Quick Setup
```bash
npm install
cp .env.local.example .env.local   # or create manually:
echo "NEXT_PUBLIC_TENANT_HOST_URL=http://localhost" >> .env.local
echo "NEXT_PUBLIC_APP_MODE=oss-tenant" >> .env.local
npm run dev
```
Access: http://localhost:3000

### All Commands
| Command | Purpose |
|---------|----------|
| `npm run dev` | Dev server (port 3000, `PORT` env to override) |
| `npm run build` | Production build (`generate-enums` + `relay-compiler` + `next build`; standalone output in `dist/`) |
| `npm run build:export` | Static-export build (`OPENFRAME_BUILD_TARGET=export`) — SPA bundle for Capacitor/Tauri native shells |
| `npm run build:local` | Production build with webpack |
| `npm run start` | Start production server |
| `npm run start:standalone` | Serve the standalone build (`dist/standalone/server.js`) |
| `npm run type-check` | TypeScript validation (`tsc --noEmit`) |
| `npm run relay` | Relay compiler — regenerates `src/__generated__/` artifacts |
| `npm run relay:watch` | Relay compiler in watch mode |
| `npm run fetch-schema` | Pull `schema.graphql` from a backend via introspection (`-- --endpoint <url> --token <JWT>`) |
| `npm run generate-enums` | Regenerate `src/generated/schema-enums.ts` (enum const+type) from `schema.graphql` |
| `npm run lint` | Next.js ESLint check |
| `npm run lint:biome` | Biome check (linting + formatting) |
| `npm run lint:biome:fix` | Biome auto-fix |
| `npm run format` | Biome format check |
| `npm run format:fix` | Biome auto-format |
| `npm run core:link` / `core:unlink` | yalc-link/unlink the core library for local lib development |

### Pre-commit Hooks
Husky (`.husky/pre-commit`) is **staged-file-scoped**: it runs Biome check on the staged frontend files and `tsc --noEmit` with errors filtered to staged files only. A clean commit does not require the whole repo to pass — but don't rely on that; keep `npm run lint:biome` and `npm run type-check` green.

### Environment Variables

**Required:**
```bash
NEXT_PUBLIC_TENANT_HOST_URL=http://localhost   # Backend API host
NEXT_PUBLIC_APP_MODE=oss-tenant                # App mode (see below)
```

**SaaS deployment:**
```bash
NEXT_PUBLIC_SHARED_HOST_URL=https://auth.openframe.ai   # Shared auth host
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-XXXXXXX                # Google Tag Manager
```

**Dev auth:**
```bash
NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER=true   # Dev ticket auth mode (Bearer tokens instead of cookies)
```

Feature flags are **not** env vars — they are server-loaded via GraphQL (see Feature Flags below). Native-shell env split is documented in `.env.export.example`.

## Architecture & Structure

### Technology Stack
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16 (^16.2.4) |
| UI Library | React | 19 (^19.2.0) |
| Type System | TypeScript | 5.8 (^5.8.3) |
| Component Library | @flamingo-stack/openframe-frontend-core | ^0.0.360 (npm registry) |
| GraphQL Data Fetching | react-relay + relay-runtime + relay-compiler | 20.1 |
| REST / Legacy Data Fetching | @tanstack/react-query | 5.90 |
| Forms | react-hook-form + @hookform/resolvers | 7.71 + 5.2 |
| Validation | zod | 4.3 |
| State Management | Zustand + immer | 5.0.8 + 10.1 |
| Styling | Tailwind CSS + tailwindcss-animate | 3.4 |
| Terminal | @xterm/xterm + @xterm/addon-fit | 6.0 + 0.11 |
| Code Editor | @monaco-editor/react | 4.7 |
| GraphQL | graphql + graphql-tag | 16.8 + 2.12 |
| Date Utils | date-fns | 4.1 |
| Icons | lucide-react | 0.454 |
| Runtime Env | next-runtime-env | 3.2 |
| Code Quality | Biome (primary) + ESLint (Next.js) | 2.4.4 + 9.27 |
| Git Hooks | Husky | 9.1 |

### Core Library is External

`@flamingo-stack/openframe-frontend-core` is **NOT part of OpenFrame** — it is a **separate, external library** shared across the Flamingo Stack.

**Key Facts:**
- **Source repo**: `openframe-oss-lib/openframe-frontend-core/`
- **Ownership**: Shared across Flamingo Stack projects (OpenFrame, OpenMSP, Flamingo, TMCG, hubs, openframe-chat)
- **Normal state**: installed from the **npm registry** (`"@flamingo-stack/openframe-frontend-core": "^0.0.360"`); the lib repo's own `package.json` version lags the registry (CI bumps at publish)
- **Local lib development**: link via **yalc** — `npm run core:link` here, and in the lib repo `npm run build && yalc push` after every change (consumers see `dist/`, not `src/`)
- **Updates**: Changes affect ALL Flamingo Stack projects

**yalc Workflow:**
```bash
# In openframe-frontend-core repo (after each change):
npm run build && yalc push

# In openframe-frontend (once, to link):
npm run core:link   # = yalc add @flamingo-stack/openframe-frontend-core
npm install
npm run core:unlink # when done — restore the registry version
```

**NEVER:**
- Treat core library as part of the OpenFrame codebase
- Make breaking changes without coordinating across projects
- Import from `@flamingo/ui-kit` (old name — does not exist)

### App Modes

Controlled by `NEXT_PUBLIC_APP_MODE` (see `src/lib/app-mode.ts`):

| Mode | Auth Pages | App Pages | Mingo | Description |
|------|-----------|-----------|-------|-------------|
| `oss-tenant` (default) | Yes | Yes | No | Self-hosted, full-featured |
| `saas-tenant` | No | Yes | Yes | SaaS customer tenant |
| `saas-shared` | Yes | No | No | SaaS shared auth service |

Helper functions: `isOssTenantMode()`, `isSaasTenantMode()`, `isSaasSharedMode()`, `isAuthEnabled()`, `isAppEnabled()`

### Feature Flags

Flags are **server-loaded**, not env-based. Names defined in `src/lib/feature-flags.ts` (e.g. `billings`, `help-center`, `notifications`, `time-tracker`, `scripts-v2`, `mingo-sidebar`, `new-onboarding`, `cancel-subscription`); fetched via the `feFeatureFlags(names:)` GraphQL query (`src/app/hooks/use-feature-flags-query.ts`) into `src/stores/feature-flags-store.ts`. `src/components/feature-flags-gate.tsx` blocks app render until flags load for authenticated users.

### Route Registry (MANDATORY)

All internal navigation URLs are built through the typed registry `src/lib/routes.ts` — never
hand-write an internal path string in `router.push`/`<Link href>`/`useSafeBack`/`redirect`:

```ts
import { routes } from '@/lib/routes';

router.push(routes.monitoring.root({ tab: 'policies' }));   // /monitoring?tab=policies
router.push(routes.customers.details(id, { tab: 'tickets' }));
<Link href={routes.devices.details(deviceId)} />
```

**When adding a new page, tab, or component that links anywhere, update `routes.ts` first,
following its typing:**
- New page/route → add an entry to `routes` (static string, or a builder function when it takes
  an id / query params), then use `routes.*` at every call site.
- New `?tab=` view → add the tab id to `TAB_IDS` and reference the derived union / `TAB_IDS`
  from the page's `TabItem[]` definition instead of re-typing string literals.
- New query param on an existing route → extend that builder's typed options object.
- Builders take `string | number` ids on purpose — guard nullable ids at the call site instead
  of widening the type.

Full rules, rationale, and the list of intentional exceptions (`not-found.tsx` legacy-redirect
table, `pathname.startsWith()` active-state checks, external/API URLs):

@./src/lib/ROUTES.md

### Application Modules

Routes live under the `(app)` / `(auth)` route groups. **Detail pages use query params** (`/x/details?id=`), not dynamic segments (static-export constraint; read via `useRequiredIdParam`). URL strings themselves come from the route registry above.

- **Authentication** (`/auth`) — Multi-provider SSO, signup, login, password reset, invite
- **Dashboard** (`/dashboard`) — Overview stats + onboarding; standalone `/onboarding` behind flag `new-onboarding`
- **Devices** (`/devices`) — Fleet MDM + Tactical RMM, detail pages, MeshCentral remote shell/desktop/file manager
- **Logs** (`/logs-page`, `/log-details`) — Streaming, search, filtering
- **Scripts** (`/scripts` legacy Tactical REST; `/scripts-v2` Relay, behind flag `scripts-v2` — implementation lives in `src/app/(app)/scripts/v2/components/`)
- **Customers** (`/customers`) — Customer/organization CRM (route renamed from `/organizations`; sidebar item id is still `organizations`)
- **Monitoring** (`/monitoring`) — Fleet osquery queries + policies (not feature-flagged)
- **Tickets** (`/tickets`) — Ticket board + AI chat dialogs (saas-tenant only; talks to `/chat/graphql`)
- **Mingo** (`/mingo`) — Admin AI assistant chat (saas-tenant only; legacy page, superseded by the in-layout drawer when flag `mingo-sidebar` is on)
- **Knowledge Base** (`/knowledge-base`) — Articles/folders (fully Relay)
- **Help Center** (`/help-center/*`) — Content pages via core-lib `help-center-pages` (flag `help-center`)
- **Worktime** (`/worktime`) — Time entries (flag `time-tracker`)
- **Notifications** (`/notifications`) — Relay reference implementation (flag `notifications`)
- **Settings** (`/settings/*`) — ai-settings, api-keys, architecture (OSS-only), billing-usage (flag `billings`), employees, sso
- **Checkout** (`/checkout/success|cancel`) — Stripe checkout result pages

### Project Structure
```
src/
├── proxy.ts               # Next 16 middleware — server-side app-mode route blocking
├── app/                   # Next.js App Router (route groups)
│   ├── (auth)/auth/       # Authentication (login, signup, invite, password-reset, stores/auth-store.ts)
│   ├── (app)/             # All app pages, wrapped by AppLayout in (app)/layout.tsx
│   │   ├── dashboard/  onboarding/  devices/  logs-page/  log-details/
│   │   ├── scripts/       # legacy + v2 implementation in scripts/v2/components/
│   │   ├── scripts-v2/    # thin route wrappers over scripts/v2 (flag-gated layout)
│   │   ├── customers/  monitoring/  tickets/  mingo/  knowledge-base/
│   │   ├── help-center/  worktime/  notifications/  settings/  checkout/
│   ├── hooks/             # Shared hooks (use-feature-flags-query, use-required-id-param, …)
│   └── components/        # Shared components (notifications provider, subscription-lock, shared tables)
├── components/            # Root-level shared (route-guard, feature-flags-gate, assignments/)
├── stores/                # Zustand stores (feature-flags-store, devices-store [mostly unused])
├── graphql/               # Relay operations by domain (notifications/, scripts/, time-tracker/)
├── __generated__/         # Relay artifacts (owned by relay-compiler — never import enums from here)
├── generated/             # schema-enums.ts (from npm run generate-enums)
├── lib/                   # Utilities & config
│   ├── api-client.ts          # Centralized REST API client (singleton, 401 refresh queue)
│   ├── auth-api-client.ts     # Auth endpoints against NEXT_PUBLIC_SHARED_HOST_URL
│   ├── fleet-api-client.ts    # Fleet MDM via /tools/fleetmdm-server
│   ├── tactical-api-client.ts # Tactical RMM via /tools/tactical-rmm
│   ├── relay/                 # Relay environment + provider (singleton, 401 refresh)
│   ├── relay-id.ts            # toGlobalId / global-id normalization
│   ├── token-store.ts  token-refresh-manager.ts  force-logout.ts  # auth token plumbing
│   ├── app-mode.ts  runtime-config.ts  feature-flags.ts
│   ├── nats/                  # NatsAppProvider + WS URL config
│   ├── native-shell.ts  native-login.ts  # Capacitor/Tauri shell bridge
│   ├── register-embed-shims.ts  navigation-config.tsx  navigation-sidebar-state.ts
│   ├── subscription-lock-signal.ts  analytics.ts  openframe-core-ui.tsx
│   ├── query-client-provider.tsx  fonts.ts  handle-api-error.ts
│   ├── meshcentral/           # MeshCentral control/tunnel/desktop/file-manager protocol
│   └── platform-configs/      # Platform-specific config
```

## Core Library Integration

### Import Patterns

```typescript
// Styles (import in root layout only)
import '@flamingo-stack/openframe-frontend-core/styles';

// UI components — direct import
import {
  Button, Card, CardHeader, CardContent, CardFooter,
  Input, Label, Badge, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
  ContentPageContainer, DetailPageContainer,
  DeviceCard, StatusTag, CardLoader, CompactPageLoader,
  DashboardInfoCard, OrganizationCard, BenefitCard,
} from '@flamingo-stack/openframe-frontend-core/components/ui';

// Feature components
import {
  AuthProvidersList,
} from '@flamingo-stack/openframe-frontend-core/components/features';

// Navigation
import { AppLayout } from '@flamingo-stack/openframe-frontend-core/components/navigation';

// Icons
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  DashboardIcon, DevicesIcon, LogsIcon, ScriptsIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';

// Hooks — CRITICAL: useToast is MANDATORY for all API operations
import {
  useToast,           // REQUIRED for all API feedback
  useApiParams,       // URL state management
  useDebounce,
  useLocalStorage,
  useTablePagination,
} from '@flamingo-stack/openframe-frontend-core/hooks';

// Utilities
import {
  cn,                             // Tailwind class merging
  getPlatformAccentColor,
  getProxiedImageUrl,
  normalizeToolTypeWithFallback,
  getSlackCommunityJoinUrl,
  DEFAULT_OS_PLATFORM,
} from '@flamingo-stack/openframe-frontend-core/utils';

// Types
import type { NavigationSidebarItem, NavigationSidebarConfig } from '@flamingo-stack/openframe-frontend-core/types/navigation';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
```

### Client Boundary Pattern

Server Components cannot import client-side UI barrel exports directly. Use the re-export wrapper:

**File:** `src/lib/openframe-core-ui.tsx`
```typescript
'use client';
export * from '@flamingo-stack/openframe-frontend-core/components/ui';
```

**Usage:**
```typescript
// In server-adjacent code (layout.tsx, etc.)
import { Toaster } from '@/lib/openframe-core-ui';
```

For regular client components, import directly from the core library.

### Component Categories
- **Core UI** — Button, Card, Input, Dialog, Tabs, Badge, Skeleton, etc.
- **Page Containers** — ContentPageContainer, DetailPageContainer
- **Data Display** — DeviceCard, StatusTag, DashboardInfoCard, OrganizationCard
- **Feature Components** — AuthProvidersList, Terminal, ToolBadge
- **Navigation** — AppLayout, sidebar config types

### Embedded Page Components (standalone + tab reuse)

Some page components render their own `PageLayout` and are used **both** as a standalone route
**and** embedded inside another page's tab (e.g. `LogsTable`, `DevicesPanel` inside customer/device
details). Core `PageLayout`/`TitleBlock` are **FROZEN** — the `TitleBlock` has a hardcoded leading
`pt-[var(--spacing-system-l)]` that is correct standalone but leaves a redundant gap under the tab bar
when embedded.

**Convention:** such a component accepts an `embedded?: boolean` prop. When `embedded`, forward
`EMBEDDED_PAGE_OFFSET` (a `-mt-[var(--spacing-system-l)]` from `@/app/components/shared`) into its
`PageLayout` `className` to cancel that top padding. The header stays; only the top gap is removed.
Callers in tabs just pass `embedded`:

```tsx
<LogsTable organizationId={organizationId} embedded />
<DevicesPanel embedded /* ... */ />
```

Do **not** modify `PageLayout`/`TitleBlock` to fix this — they are frozen.

## Development Patterns

### CRITICAL: React Hooks Rules

**React Hooks MUST be called unconditionally:**
```typescript
// BAD: Hooks called conditionally
export function MyComponent() {
  if (someCondition) {
    return null;  // Early return BEFORE hooks
  }
  const data = useSomeHook();  // ERROR: Hook called after conditional
}

// GOOD: All hooks at the top, unconditionally
export function MyComponent() {
  const data = useSomeHook();
  const router = useRouter();
  const searchParams = useSearchParams();

  // THEN check conditions
  if (someCondition) {
    return null;
  }

  return <div>{data}</div>;
}
```

**Rules:**
1. Move all hooks to the top of the component
2. Use conditional logic INSIDE hooks (useEffect, useMemo), not around them
3. Never wrap hooks in try-catch — handle errors inside the hook instead

### Data Fetching Strategy

The app is **gradually migrating GraphQL data fetching to react-relay**. The rules:

1. **New GraphQL code against `/api/graphql` → react-relay.** Queries, fragments, mutations, pagination — all through Relay.
2. **REST APIs → `@tanstack/react-query`** with `apiClient` (this is not changing).
3. **Legacy GraphQL** (raw POST through `apiClient` or react-query wrappers) still exists — leave it working, but migrate it to Relay when touching it substantially. Do not add new code in that style.
4. **Exception — the `/chat/graphql` domain (tickets, mingo, AI settings)**: it talks to the saas-ai-agent service whose schema is NOT in `schema.graphql`, so it stays on raw-POST permanently. Extending raw-POST there is correct, not a violation.
5. No Apollo Client anywhere.

### GraphQL with react-relay (preferred)

**Setup:**
- Schema: `schema.graphql` (repo root of the frontend service)
- Config: `relay.config.json`; generated artifacts in `src/__generated__/`
- Environment/provider: `src/lib/relay/` (singleton, cookie auth + 401 refresh, mounted in root layout above all other providers)
- Run `npm run relay` after adding/changing any `graphql\`...\`` tag (`npm run build` also runs it)
- Operation names MUST be prefixed with the camelCased file name (e.g. `unread-counts-relay.ts` → `unreadCountsRelayQuery`)
- **Enum / scalar types come from `@/generated/schema-enums`, NEVER from a query's Relay artifact.** `src/generated/schema-enums.ts` is generated from `schema.graphql` by `npm run generate-enums` (Prisma-style: the same name is both a `const` value and a `type`, so `ScriptShell.CMD` and `const s: ScriptShell` both work). Do NOT `import type { ScriptShell } from '@/__generated__/<someQuery>.graphql'` — relay-compiler owns `src/__generated__/`, re-emits per-operation copies, and prunes them, so those imports are unstable. Refresh the SDL with `npm run fetch-schema`, then `npm run generate-enums`.

**Reference implementations** (notifications domain, fully on Relay):
- `src/graphql/notifications/` — query/fragment/mutation definitions, connection updaters via `ConnectionHandler`
- `src/app/components/notifications/notifications-data-provider.tsx` — `useLazyLoadQuery`, `usePaginationFragment`, `commitLocalUpdate` for NATS live updates
- `src/graphql/notifications/unread-counts-relay.ts` — small query + `fetchQuery` store refresh pattern

**Patterns:**
```typescript
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay';
import type { myFileNameQuery as MyFileNameQueryType } from '@/__generated__/myFileNameQuery.graphql';

export const myFileNameQuery = graphql`
  query myFileNameQuery($first: Int!) {
    notifications(first: $first) { ... }
  }
`;

// In a component (wrap in <Suspense> — useLazyLoadQuery suspends):
const data = useLazyLoadQuery<MyFileNameQueryType>(myFileNameQuery, { first: 30 }, { fetchPolicy: 'store-and-network' });
```
- Prefer fragments + `usePaginationFragment` for connections; use `@connection` + `ConnectionHandler` updaters to keep lists consistent after mutations
- Mutations: `useMutation` with `optimisticUpdater`/`updater`; toast feedback via `useToast` in `onError` stays mandatory
- To refresh store data imperatively: `fetchQuery(environment, query, vars, { fetchPolicy: 'network-only' }).subscribe({})` — all subscribed components re-render from the store

### REST Fetching with TanStack React Query

REST (non-GraphQL) server state uses `@tanstack/react-query` with `apiClient`.

**Query pattern:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { apiClient } from '@/lib/api-client';

// Define query keys
export const devicesQueryKeys = {
  all: ['devices'] as const,
  detail: (id: string) => ['devices', id] as const,
};

// Query hook
export function useDevices() {
  return useQuery({
    queryKey: devicesQueryKeys.all,
    queryFn: async () => {
      const response = await apiClient.get('/api/devices');
      if (!response.ok) throw new Error(response.error || 'Failed to fetch devices');
      return response.data;
    },
  });
}

// Mutation hook with toast feedback
export function useDeleteDevice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await apiClient.delete(`/api/devices/${deviceId}`);
      if (!response.ok) throw new Error(response.error || 'Failed to delete device');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devicesQueryKeys.all });
      toast({ title: 'Success', description: 'Device deleted', variant: 'success' });
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete device',
        variant: 'destructive',
      });
    },
  });
}
```

**QueryClient configuration** (in `src/lib/query-client-provider.tsx`):
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,          // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});
```

### Legacy GraphQL Usage (do not extend)

Older code sends GraphQL queries as raw POST requests through `apiClient`:
```typescript
const response = await apiClient.post('/api/graphql', {
  query: GET_DEVICES_QUERY,
  variables: { limit: 20, cursor: null },
});
```
This style is being migrated to react-relay. Don't write new code like this; when substantially reworking a feature that uses it, migrate it to Relay. The exception is the `/chat/graphql` domain (tickets/mingo/AI settings) — permanently raw-POST, see Data Fetching Strategy.

The GraphQL endpoint is determined at runtime: `${NEXT_PUBLIC_TENANT_HOST_URL || window.location.origin}/api/graphql` (the Relay environment resolves the same endpoint).

### API Error Handling with useToast

**MANDATORY:** All API operations must provide user feedback via `useToast`:

```typescript
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';

// In mutations — use onSuccess/onError callbacks
const mutation = useMutation({
  mutationFn: someApiCall,
  onSuccess: () => {
    toast({ title: 'Success', description: 'Operation completed', variant: 'success' });
  },
  onError: (err) => {
    toast({
      title: 'Error',
      description: err instanceof Error ? err.message : 'Operation failed',
      variant: 'destructive',
    });
  },
});
```

Use `src/lib/handle-api-error.ts` for reusable error extraction:
```typescript
import { handleApiError, getErrorMessage } from '@/lib/handle-api-error';
```

### Forms with react-hook-form + zod

Use `react-hook-form` with `zod` schemas for all forms:

```typescript
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';

// 1. Define schema
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  timeout: z.number().min(1).max(86400),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
});

type FormData = z.infer<typeof formSchema>;

// 2. Use in component
export function MyForm() {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', timeout: 90, platforms: ['windows'] },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => { /* API call */ },
    onSuccess: () => toast({ title: 'Saved', description: 'Form submitted', variant: 'success' }),
    onError: (err) => toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' }),
  });

  const onSubmit = form.handleSubmit(
    (data) => mutation.mutate(data),
    (errors) => {
      const messages = Object.values(errors).map(e => e?.message).filter(Boolean);
      toast({ title: 'Validation Error', description: messages.join(', '), variant: 'destructive' });
    },
  );

  return (
    <form onSubmit={onSubmit}>
      <Controller name="name" control={form.control} render={({ field }) => <Input {...field} />} />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

**Real example:** See `src/app/(app)/scripts/hooks/use-edit-script-form.ts` and `src/app/(app)/scripts/types/edit-script.types.ts`.

### State Management with Zustand

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface MyState {
  items: Item[];
  setItems: (items: Item[]) => void;
}

export const useMyStore = create<MyState>()(
  devtools(
    immer((set) => ({
      items: [],
      setItems: (items) => set(state => { state.items = items }),
    })),
    { name: 'my-store' },
  ),
);
```

**Existing stores:**
- `useAuthStore` — authentication state (`src/app/(auth)/auth/stores/auth-store.ts`; persist key `auth-storage`)
- `useFeatureFlagsStore` — server-loaded feature flags (`src/stores/feature-flags-store.ts`)
- `useDevicesStore` — `src/stores/devices-store.ts` (persist key `devices-store`; mostly unused — devices flow through react-query)
- Domain stores live in their modules (tickets, mingo, scripts); central re-exports from `src/stores/index.ts`

### Code Quality with Biome

**Biome 2.4.4** is the primary linter and formatter (configured in `biome.json`).

**Key rules:**
- `useConst` — always use `const` when possible
- `noUnusedVariables` — error
- `useHookAtTopLevel` — error (enforces React hooks rules)
- `useExhaustiveDependencies` — warn
- `useNamingConvention` — enforced (camelCase for variables, PascalCase for types/classes)
- `noUndeclaredDependencies` — error (off in test files)

**Formatter settings:**
- 2-space indent, 120 char line width, single quotes, trailing commas, semicolons always

**Run manually:**
```bash
npm run lint:biome       # Check
npm run lint:biome:fix   # Auto-fix
npm run format:fix       # Auto-format
```

## URL State Management (useApiParams)

URL state (pagination, filters, search) uses the core library's `useApiParams` with a manual schema — for GraphQL-backed and REST-backed tables alike. The old runtime-introspection `useQueryParams` system is no longer used in this app.

```typescript
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';

const { params, setParam, setParams } = useApiParams({
  search: { type: 'string', default: '' },
  page: { type: 'number', default: 1 },
  status: { type: 'string', default: 'all' },
});
```

**Used in:** LogsTable, DevicesView, ScriptsTable, customers/monitoring/tickets tables (~22 files).

## Root Layout & Provider Stack

The root layout (`src/app/layout.tsx`) establishes the global provider hierarchy:

```
<html> (dark mode, font variables)
  <head>
    <PublicEnvScript />              <!-- next-runtime-env (skipped in export builds) -->
    (sidebar-width FOUC script)
  </head>
  <body>
    <GoogleTagManager />             <!-- Analytics (if GTM ID set) -->
    <EmbedShimRegistration />        <!-- registers Next router/Link/Image into core-lib embed-shims -->
    <DeploymentInitializer />        <!-- Runtime detection -->
    <NativeShellInitializer />       <!-- Capacitor/Tauri shell bridge -->
    <RelayProvider>                  <!-- react-relay environment (singleton) -->
      <QueryClientProvider>          <!-- TanStack React Query -->
        <DevTicketObserver />        <!-- Dev auth (if auth enabled) -->
        <NatsAppProvider>            <!-- NATS live updates -->
          <FeatureFlagsGate>         <!-- blocks render until server flags load -->
            <NotificationsDataProvider>  <!-- Notifications drawer/popups (Relay) -->
              <RouteGuard>           <!-- App mode route filtering -->
                <Suspense fallback={AppShellSkeleton}>
                  {children}         <!-- Page content -->
                </Suspense>
              </RouteGuard>
            </NotificationsDataProvider>
          </FeatureFlagsGate>
        </NatsAppProvider>
      </QueryClientProvider>
    </RelayProvider>
    <Toaster />                      <!-- Toast notifications -->
  </body>
</html>
```

**Fonts:** DM Sans (body) + Azeret Mono (code) — loaded via `next/font/google`

**Rendering:** dual output — `standalone` (default) or full static `export` (`OPENFRAME_BUILD_TARGET=export`); `trailingSlash: true` everywhere, `skipTrailingSlashRedirect` only in standalone (export builds break without trailing slashes). This is why detail pages use `?id=` query params instead of dynamic segments.

## Fleet MDM Integration

OpenFrame integrates device monitoring data from multiple sources with normalization.

### Multi-Source Data Architecture

**Data Sources:**
1. **GraphQL** — Primary device registry and agent information
2. **Fleet MDM** — Accurate hardware specs, battery health, users
3. **Tactical RMM** — Legacy device monitoring data

**Merge logic locations** (there is no `normalize-device.ts`):
- Detail page: `createDevice()` in `src/app/(app)/devices/hooks/use-device-details.ts` — raw-POST GraphQL node + fan-out to Tactical agent, Fleet host, and Mesh deviceStatus
- List page: `createDeviceListItem()` in `src/app/(app)/devices/utils/device-transform.ts` — GraphQL node only, no external fan-out

**Priority rules** (in `createDevice()`):
```
Hardware (CPU/RAM/storage/battery/software/users/mdm):  Fleet only
Serial/manufacturer/model/OS:  Fleet -> GraphQL node
Status:                        GraphQL node -> Fleet
Last seen:                     Fleet -> GraphQL node
Agent version:                 GraphQL node -> Fleet osquery_version
Public IP:                     filtered by isPrivateIp (10/172.16-31/192.168/127/169.254/fe80/fc00/fd00/::1)
Local IPs:                     dedup [fleet.primary_ip, fleet.public_ip-if-public, node.ip]
```

### Key Types

**Fleet types** — `src/app/devices/types/fleet.types.ts`:
```typescript
export interface FleetHost {
  cpu_brand: string;
  cpu_physical_cores: number;
  cpu_logical_cores: number;
  memory: number;           // bytes
  primary_ip: string;
  public_ip: string;        // May be private — filter it!
  users: FleetUser[];
  batteries: FleetBattery[];
  software: FleetSoftware[];
  mdm: FleetMDMInfo;
}
```

**Unified types** — `src/app/devices/types/device.types.ts`:
```typescript
export interface UnifiedUser {
  username: string;
  uid?: number;
  type?: string;            // "person" | "service"
  source: 'fleet' | 'tactical' | 'unknown';
}
```

### Key Files
- `src/app/(app)/devices/types/fleet.types.ts` — Complete Fleet MDM types
- `src/app/(app)/devices/types/device.types.ts` — Unified device types (flat `Device`, all fields at root)
- `src/app/(app)/devices/hooks/use-device-details.ts` — Multi-source merge (`createDevice()`)
- `src/app/(app)/devices/utils/device-transform.ts` — List-item transform
- `src/app/(app)/devices/components/tabs/` — hardware/network/users/os/software/… tabs
- `src/lib/fleet-api-client.ts` — Fleet API integration
- `src/lib/tactical-api-client.ts` — Tactical RMM API integration

## Accessibility Standards

### Required Practices
1. **Semantic HTML** — Use proper HTML elements and core library components
2. **Keyboard Navigation** — Core library provides automatic support
3. **Screen Reader Support** — Add aria-labels and descriptions
4. **Color/Contrast** — Use ODS design tokens only
5. **Focus Management** — Handle focus in modals and dynamic content

### ODS Design Tokens (MANDATORY)

ALL styling must use ODS design tokens — never hardcode colors, font families, font sizes, or spacing.

The full canonical ODS token rules (colors, spacing, typography, Figma workflow) are the **single
source of truth** maintained in `@flamingo-stack/openframe-frontend-core` and imported here straight
from the installed package. Edit the rules in the core lib, not here:

@./node_modules/@flamingo-stack/openframe-frontend-core/src/ODS_TOKEN_RULES.md

**Tailwind preset:** ODS colors/utilities are provided via the core library's Tailwind preset (see `tailwind.config.ts`).

### Inverted Progress Bar
```typescript
// Disk usage: high = bad (red)
<ProgressBar progress={diskUsage} inverted={false} />

// Battery health: high = good (green)
<ProgressBar progress={batteryHealth} inverted={true} />
```

## Testing & Deployment

### Development Testing
| Command | Purpose |
|---------|---------|
| `npm run type-check` | TypeScript validation |
| `npm run lint:biome` | Biome linting + formatting |
| `npm run build` | Production build verification |

### Build & Deployment
```bash
npm run build       # Output: dist/ directory
npm run start       # Serve production build
```

**Deployment Targets:**
- Container deployment with nginx
- Static hosting (Vercel, Netlify, AWS S3)
- CDN distribution

## Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
lsof -i:3000                    # Check port usage
PORT=3001 npm run dev           # Use different port
```

**Core Library Issues (when yalc-linked):**
```bash
# In the lib repo — rebuild + push into linked consumers
cd ~/flamingo/openframe-oss-lib/openframe-frontend-core
npm run build && yalc push

# In this repo — (re)link / unlink
npm run core:link && npm install
npm run core:unlink   # back to the registry version
```

**Biome Errors:**
```bash
npm run lint:biome:fix    # Auto-fix most issues
npm run format:fix        # Fix formatting
```

**API Connection:**
- Verify `NEXT_PUBLIC_TENANT_HOST_URL` matches backend
- Check CORS configuration
- For dev ticket mode, ensure `NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER=true`

**State Management:**
```javascript
// Clear corrupted localStorage
localStorage.removeItem('devices-store');
localStorage.removeItem('auth-storage');
```

## Key Integration Points

### Backend Services (all via the gateway)
- **REST** — `/api/*` — openframe-api
- **GraphQL** — `/api/graphql` — openframe-api (Relay + legacy); `/chat/graphql` — saas-ai-agent (tickets/mingo, raw-POST, SaaS only)
- **Live updates** — NATS over WebSocket at `/ws/nats-api` (notifications, chat chunks); tool WS at `/ws/tools/{toolId}`
- **Authentication** — `/oauth/*` (gateway BFF: login/callback/refresh/logout/dev-exchange); registration via `/sas/oauth/*`
- **Tool proxies** — `/tools/{toolId}/*` (Fleet, Tactical; API keys injected by the gateway)

### API Client Architecture

The `ApiClient` singleton (`src/lib/api-client.ts`) handles:
- Cookie-based auth (production) + header-based auth (dev ticket mode)
- Automatic 401 detection and token refresh
- Request queuing during refresh
- Force logout on auth failure

```typescript
import { apiClient } from '@/lib/api-client';

const response = await apiClient.get<Device[]>('/api/devices');
if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

### External Dependencies
- **Core Library** — `@flamingo-stack/openframe-frontend-core` (npm registry; yalc for local lib dev)
- **Terminal** — @xterm/xterm 6.0 integration
- **Code Editor** — Monaco Editor for script editing
- **Fleet MDM** — Device monitoring integration
- **Tactical RMM** — Device monitoring integration
- **MeshCentral** — Remote desktop/shell/file management (via `src/lib/meshcentral/`)

---

**Final Reminders:**
1. **Core library is EXTERNAL** — separate repo, not part of OpenFrame
2. **Always use core library components** — no custom UI primitives
3. **Always use `useToast`** for all API operation feedback
4. **Use ODS design tokens** — never hardcode colors or styles
5. **Use react-relay for GraphQL** (gradual migration — prefer it wherever possible); **TanStack React Query for REST** — no Apollo Client, no new raw-POST GraphQL
6. **Use react-hook-form + zod** for forms
7. **Biome is the primary linter** — must pass before commits
8. **Normalize multi-source device data** — Fleet-first priority; merge logic in `use-device-details.ts` `createDevice()`
9. **Build internal URLs via `routes.*` from `src/lib/routes.ts`** — no raw path strings; new pages/tabs must be added to the registry (see `src/lib/ROUTES.md`)
