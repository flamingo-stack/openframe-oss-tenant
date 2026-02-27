# OpenFrame Frontend - Claude Development Guide

**Next.js 16 + React 19 + TypeScript 5.8 + @flamingo-stack/openframe-frontend-core (v0.0.46)**

> Comprehensive instructions for Claude when working with the OpenFrame Frontend service.

## Core Principles

**MANDATORY REQUIREMENTS:**
1. ALL UI components MUST use `@flamingo-stack/openframe-frontend-core` — never create custom UI primitives
2. ALL styling MUST use ODS design tokens (no hardcoded colors)
3. Follow WCAG 2.1 AA accessibility standards
4. Use `react-hook-form` + `zod` for forms; use `useToast` for all API feedback
5. Use `@tanstack/react-query` for all server-state data fetching

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
| `npm run dev` | Dev server with webpack (port 3000) |
| `npm run dev:turbo` | Dev server with Turbopack (port 3000) |
| `npm run build` | Production build |
| `npm run build:local` | Production build with webpack |
| `npm run start` | Start production server |
| `npm run type-check` | TypeScript validation (`tsc --noEmit`) |
| `npm run lint` | Next.js ESLint check |
| `npm run lint:biome` | Biome check (linting + formatting) |
| `npm run lint:biome:fix` | Biome auto-fix |
| `npm run format` | Biome format check |
| `npm run format:fix` | Biome auto-format |

### Pre-commit Hooks
Husky runs on every commit:
```bash
npm run lint:biome && npm run type-check
```
Both must pass before commits are accepted.

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

**Feature flags:**
```bash
NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER=true   # Dev ticket auth mode
NEXT_PUBLIC_FEATURE_ORG_IMAGES=true            # Organization images (default: true)
NEXT_PUBLIC_ENABLE_SSO_DOMAIN_ALLOWLIST=true   # SSO domain allowlist (default: true)
NEXT_PUBLIC_FEATURE_SCRIPT_SCHEDULE=false       # Script scheduling (default: false)
NEXT_PUBLIC_FEATURE_MONITORING=false            # Monitoring pages (default: false)
```

## Architecture & Structure

### Technology Stack
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16 (^16.0.10) |
| UI Library | React | 19 (^19.2.0) |
| Type System | TypeScript | 5.8 (^5.8.3) |
| Component Library | @flamingo-stack/openframe-frontend-core | 0.0.46 |
| Data Fetching | @tanstack/react-query | 5.90 |
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
- **Ownership**: Shared across Flamingo Stack projects (OpenFrame, Flamingo, TMCG)
- **Connection**: Published via **yalc** for local development
- **Production**: Installed as `@flamingo-stack/openframe-frontend-core` npm package
- **Updates**: Changes affect ALL Flamingo Stack projects

**yalc Workflow:**
```bash
# In openframe-frontend-core repo:
yalc publish

# In openframe-frontend:
yalc add @flamingo-stack/openframe-frontend-core
npm install
```

**package.json reference:**
```json
"@flamingo-stack/openframe-frontend-core": "0.0.46"
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

Defined in `src/lib/feature-flags.ts`:
- `featureFlags.organizationImages.enabled()` — org image upload/display
- `featureFlags.ssoAutoAllow.enabled()` — SSO domain allowlist
- `featureFlags.monitoring.enabled()` — monitoring pages visibility

### Application Modules
- **Authentication** (`/auth`) — Multi-provider SSO, signup, login, password reset, invite
- **Dashboard** (`/dashboard`) — System overview, real-time metrics, onboarding
- **Devices** (`/devices`) — Fleet MDM + Tactical RMM, detail pages, remote shell/desktop, file manager
- **Logs** (`/logs-page`, `/log-details`) — Streaming, search, filtering, export
- **Scripts** (`/scripts`) — Script management, editing (Monaco), execution, scheduling
- **Organizations** (`/organizations`) — Multi-org management, detail/edit pages
- **Monitoring** (`/monitoring`) — Queries, policies (feature-flagged)
- **Tickets** (`/tickets`) — Ticket management, dialog view
- **Mingo** (`/mingo`) — MongoDB-like query builder (SaaS only)
- **Settings** (`/settings`) — Application settings

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication (login, signup, invite, password-reset)
│   ├── dashboard/         # Main dashboard
│   ├── devices/           # Device management
│   │   ├── components/tabs/   # hardware-tab, network-tab, users-tab
│   │   ├── types/             # fleet.types.ts, device.types.ts
│   │   ├── utils/             # normalize-device.ts
│   │   ├── hooks/             # useDevices, etc.
│   │   ├── details/[deviceId]/ # Detail, remote-shell, remote-desktop, file-manager
│   │   └── new/               # Add device
│   ├── logs-page/         # Log analysis
│   ├── log-details/       # Log detail view
│   ├── scripts/           # Script management + scheduling
│   ├── organizations/     # Organization management
│   ├── monitoring/        # Queries + policies (feature-flagged)
│   ├── tickets/           # Ticket system
│   ├── mingo/             # Query interface (SaaS only)
│   ├── settings/          # Settings
│   ├── hooks/             # Shared hooks
│   └── components/        # Shared components (app-layout, route-guard, etc.)
├── components/            # Root-level shared components
├── stores/                # Zustand stores (devices-store, auth re-exports)
├── lib/                   # Utilities & config
│   ├── api-client.ts          # Centralized REST API client (singleton)
│   ├── auth-api-client.ts     # Auth-specific API client
│   ├── fleet-api-client.ts    # Fleet MDM API client
│   ├── tactical-api-client.ts # Tactical RMM API client
│   ├── graphql-client.ts      # GraphQL introspection setup
│   ├── app-mode.ts            # App mode helpers
│   ├── runtime-config.ts      # Runtime env var access
│   ├── feature-flags.ts       # Feature flag definitions
│   ├── openframe-core-ui.tsx  # Client boundary re-export
│   ├── query-client-provider.tsx # TanStack QueryClient
│   ├── fonts.ts               # DM Sans + Azeret Mono
│   ├── handle-api-error.ts    # Error extraction utility
│   ├── meshcentral/           # MeshCentral remote management
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
  useApiParams,       // URL state management for REST APIs
  useDebounce,
  useLocalStorage,
  useTablePagination,
  introspector,       // GraphQL schema introspection
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

### Data Fetching with TanStack React Query

All server-state data fetching uses `@tanstack/react-query`. No Apollo Client.

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

### GraphQL Usage

GraphQL queries are sent as raw POST requests through `apiClient` — there is no Apollo Client:
```typescript
const response = await apiClient.post('/api/graphql', {
  query: GET_DEVICES_QUERY,
  variables: { limit: 20, cursor: null },
});
```

The GraphQL endpoint is determined at runtime: `${window.location.origin}/api/graphql`

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

**Real example:** See `src/app/scripts/hooks/use-edit-script-form.ts` and `src/app/scripts/types/edit-script.types.ts`.

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
- `useAuthStore` — authentication state (in `src/app/auth/stores/auth-store.ts`)
- `useDevicesStore` — device list state (in `src/stores/devices-store.ts`)
- Central re-exports from `src/stores/index.ts`

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

## URL State Management (Runtime Schema-Driven)

OpenFrame uses a **runtime schema-driven URL state management system** from the core library that automatically syncs pagination, filtering, and search parameters with URL params.

### Core Features
- **Runtime Introspection**: Fetches GraphQL schema behind auth (no build-time codegen)
- **Auto-Flattening**: Nested input types flattened to simple URL params
- **Bidirectional Sync**: URL params <-> GraphQL variables
- **Zero Build Dependencies**: No GraphQL CodeGen needed

### GraphQL URL State (useQueryParams)

```typescript
import { useQueryParams } from '@flamingo-stack/openframe-frontend-core/hooks';

const { variables, setParam } = useQueryParams(GET_LOGS_QUERY, {
  defaultValues: { limit: 20 },
});
// URL: /logs?search=error&severity=critical&limit=20
// variables: { search: 'error', filter: { severity: ['critical'] }, limit: 20 }
```

### REST API URL State (useApiParams)

For non-GraphQL APIs, use `useApiParams` with a manual schema:
```typescript
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';

const { params, setParam, setParams } = useApiParams({
  search: { type: 'string', default: '' },
  page: { type: 'number', default: 1 },
  status: { type: 'string', default: 'all' },
});
```

**Used in:** LogsTable, OrganizationsTable, DevicesView, ScriptsTable, ScriptSchedulesTable, MonitoringQueries/Policies, TicketsView

### Introspection Initialization

Must be initialized after authentication (handled in `GraphQlIntrospectionInitializer`):
```typescript
import { initializeGraphQlIntrospection } from '@/lib/graphql-client';

useEffect(() => {
  if (isAuthenticated) {
    initializeGraphQlIntrospection();
  }
}, [isAuthenticated]);
```

## Root Layout & Provider Stack

The root layout (`src/app/layout.tsx`) establishes the global provider hierarchy:

```
<html> (dark mode, font variables)
  <head>
    <PublicEnvScript />              <!-- next-runtime-env -->
  </head>
  <body>
    <GoogleTagManager />             <!-- Analytics (if GTM ID set) -->
    <DeploymentInitializer />        <!-- Runtime detection -->
    <DevTicketObserver />            <!-- Dev auth (if enabled) -->
    <GraphQlIntrospectionInitializer />  <!-- Schema cache -->
    <QueryClientProvider>            <!-- TanStack React Query -->
      <RouteGuard>                   <!-- App mode route filtering -->
        <Suspense>
          {children}                 <!-- Page content -->
        </Suspense>
      </RouteGuard>
    </QueryClientProvider>
    <Toaster />                      <!-- Toast notifications -->
  </body>
</html>
```

**Fonts:** DM Sans (body) + Azeret Mono (code) — loaded via `next/font/google`

**Rendering:** `export const dynamic = 'force-dynamic'` on the root layout (prevents SSG issues with `useSearchParams`).

## Fleet MDM Integration

OpenFrame integrates device monitoring data from multiple sources with normalization.

### Multi-Source Data Architecture

**Data Sources:**
1. **GraphQL** — Primary device registry and agent information
2. **Fleet MDM** — Accurate hardware specs, battery health, users
3. **Tactical RMM** — Legacy device monitoring data

**Normalization Strategy** (in `src/app/devices/utils/normalize-device.ts`):
```
Core Hardware/System:  Fleet MDM -> GraphQL -> Tactical RMM
Agent Version:         GraphQL -> Tactical RMM -> Fleet MDM
IP Addresses:          Unified array with Fleet first
Users:                 Unified type (Fleet + Tactical)
Public IP:             Filtered (excludes private IPs)
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
- `src/app/devices/types/fleet.types.ts` — Complete Fleet MDM types
- `src/app/devices/types/device.types.ts` — Unified device + user types
- `src/app/devices/utils/normalize-device.ts` — Multi-source normalization
- `src/app/devices/components/tabs/hardware-tab.tsx` — Battery, CPU, disk, RAM
- `src/app/devices/components/tabs/network-tab.tsx` — Unified IPs
- `src/app/devices/components/tabs/users-tab.tsx` — Unified users
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
```typescript
// GOOD: Using ODS tokens
<Card className="bg-ods-card border-ods-border">
  <div className="text-ods-text-primary">Primary text</div>
  <div className="text-ods-text-secondary">Secondary text</div>
</Card>

// BAD: Hardcoded values
<Card className="bg-gray-800 border-gray-700">
  <div className="text-white">Primary text</div>
</Card>
```

**Key tokens:**
```css
--ods-attention-green-success: #5ea62e
--ods-attention-red-error: #f36666
--color-warning: #f59e0b
--ods-card: #212121
--ods-border: #3a3a3a
--ods-text-primary: #fafafa
--ods-text-secondary: #888888
```

**Tailwind preset:** ODS colors are provided via the core library's Tailwind preset (see `tailwind.config.ts`).

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

**Core Library Issues:**
```bash
# Re-link via yalc
cd ~/flamingo/openframe-oss-lib/openframe-frontend-core
yalc publish
cd ~/flamingo/openframe-oss-tenant/openframe/services/openframe-frontend
yalc add @flamingo-stack/openframe-frontend-core
npm install
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
localStorage.removeItem('auth-store');
```

## Key Integration Points

### Backend Services
- **API Gateway** — `/api` — Primary API access
- **GraphQL** — `/api/graphql` — Data queries
- **WebSocket** — `/api/ws` — Live updates
- **Authentication** — `/api/oauth/*` — OAuth2/OpenID Connect

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
- **Core Library** — `@flamingo-stack/openframe-frontend-core` (via yalc)
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
5. **Use TanStack React Query** for all data fetching — no Apollo Client
6. **Use react-hook-form + zod** for forms
7. **Biome is the primary linter** — must pass before commits
8. **Normalize multi-source data** — Fleet -> GraphQL -> Tactical priority
