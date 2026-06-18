# OpenFrame Chat Desktop Client — Claude Development Guide

**Tauri 2 + React 19 + TypeScript 5 + Vite 5 + @flamingo-stack/openframe-frontend-core**

A cross-platform desktop chat client. Web UI rendered in a Tauri webview; native shell + filesystem/dialog access via Tauri plugins backed by Rust.

This file complements the parent `openframe-oss-tenant/CLAUDE.md` (backend services, auth flow, GraphQL) and the global `~/.claude/CLAUDE.md` (behavior rules). Read both before deeper changes.

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (`@tauri-apps/api`, `@tauri-apps/cli`) — Rust backend in `src-tauri/` |
| UI Framework | React 19 + TypeScript 5.2 (strict mode) |
| Build | Vite 5 + `@vitejs/plugin-react` |
| UI Library | `@flamingo-stack/openframe-frontend-core` (external shared design system) |
| Data fetching | `@tanstack/react-query` + `graphql-request` (no Apollo) |
| Styling | Tailwind 3.4 + `tailwindcss-animate` + ODS design tokens |
| Tauri plugins | `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog` |
| Code quality | Biome 2.4 (lint + format) |

## Commands

```bash
npm install                  # Install JS deps (Rust deps fetched by `tauri dev`/`build`)
npm run dev                  # Run full desktop app (Tauri shell + Vite dev server)
npm run frontend:dev         # Vite only — for UI work without launching the native shell
npm run build                # Vite production build (web assets)
npm run tauri build          # Build the native desktop app (uses Vite build first)
npm run type-check           # tsc --noEmit
npm run lint:biome           # Biome check (lint + format)
npm run lint:biome:fix       # Biome auto-fix
npm run format:fix           # Biome formatter
npm run icons                # Regenerate app icons via scripts/generate-icons.js
```

## Core rules

### 1. UI primitives come from `@flamingo-stack/openframe-frontend-core`

Same rule as `openframe-frontend` — never create custom UI primitives. Components, hooks, and utilities live in the shared core library.

```typescript
import { Button, Card, Dialog, Input } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks'
import { cn } from '@flamingo-stack/openframe-frontend-core/utils'
import '@flamingo-stack/openframe-frontend-core/styles'
```

If a needed component is missing from the core library, raise it in the core lib repo. Don't fork it into the chat client.

### 2. ODS design tokens only — no hardcoded colors or font sizes

Same token system as the rest of the Flamingo stack. Use `bg-ods-card`, `text-ods-text-primary`, `border-ods-border`, `bg-ods-accent`, `text-ods-error`, etc. Never use `bg-gray-800`, raw hex, or `text-[14px]`.

### 3. React hooks at the top, unconditionally

No early returns before hooks. No hooks inside try/catch. Conditional logic goes *inside* `useEffect` / `useMemo`, not around the hook call.

### 4. Tauri — use the JS API, not Node.js

The webview has no Node.js. Filesystem, dialogs, and shell access go through Tauri plugins:

```typescript
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
```

Never `import fs from 'fs'`, `path`, or `child_process` — they don't exist at runtime. Same for `process.env`: use Vite's `import.meta.env.VITE_*` for build-time vars and Tauri commands for runtime values that originate from the OS.

When adding a feature that needs OS access, decide first:
- If a Tauri plugin already covers it → use the plugin from JS.
- If it needs custom Rust logic → add a `#[tauri::command]` in `src-tauri/src/` and call it with `invoke(...)`.

### 5. Data fetching

GraphQL goes through `graphql-request` wrapped in TanStack Query. There is no Apollo Client. Toast feedback for mutations is mandatory (`useToast` from the core library) — same pattern as `openframe-frontend`.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
```

### 6. Code quality gate

Biome is the linter and formatter. Before considering work complete:

```bash
npm run type-check     # must pass
npm run lint:biome     # must pass
```

## Project layout

```
.
├── src/                 # React app
│   ├── App.tsx          # Root component
│   ├── main.tsx         # Vite entry point
│   ├── components/      # Local components (composed from core lib primitives)
│   ├── contexts/        # React contexts
│   ├── hooks/           # Local hooks
│   ├── services/        # API / Tauri-invoke wrappers
│   ├── views/           # Top-level screens
│   ├── config/          # Runtime config
│   ├── shims/           # Browser/Tauri compatibility shims
│   ├── styles/          # CSS (ODS tokens consumed via core lib)
│   ├── utils/           # Local utilities
│   └── assets/          # Static assets
├── src-tauri/           # Rust backend (Tauri commands, plugins, manifest)
├── tailwind.config.ts   # Extends the core library's preset
├── vite.config.ts       # Vite + React + Tauri integration
├── biome.json           # Biome config
└── package.json
```

## Backend integration

The chat client talks to the OpenFrame backend (`openframe-api` / `openframe-gateway`). Auth uses the same JWT-in-HTTP-only-cookie scheme as the web frontend — see the parent `openframe-oss-tenant/CLAUDE.md` for the full flow. Cookie storage in a Tauri webview behaves like a normal browser webview; do not roll a custom token store unless there's a concrete reason.

## What NOT to do

- Don't create custom UI primitives — extend or contribute to `openframe-frontend-core` instead.
- Don't import Node.js built-ins (`fs`, `path`, `child_process`, etc.) into React code. Use Tauri plugins or commands.
- Don't add Apollo Client. The chat client deliberately uses `graphql-request` + TanStack Query.
- Don't hardcode colors, hex values, or pixel font sizes. ODS tokens or the Tailwind preset only.
- Don't import from `@flamingo/ui-kit` — that name does not resolve in this project.
