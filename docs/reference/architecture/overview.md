# openframe-oss-tenant Module Documentation

# OpenFrame OSS Tenant — Architecture Documentation

## Overview

OpenFrame OSS Tenant is the multi-service, multi-tenant open-source foundation of the OpenFrame platform — an AI-powered MSP (Managed Service Provider) platform that replaces expensive proprietary software with intelligent automation. It integrates device management, real-time messaging, AI-assisted support (Mingo AI for technicians, Fae for clients), and event-driven automation across a polyglot microservice architecture built on Spring Boot (Java), Rust, and TypeScript.

---

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph Clients["Client Layer"]
        ChatApp["openframe-chat\n(Tauri Desktop App)"]
        FrontendUI["openframe-frontend\n(Web UI)"]
    end

    subgraph Gateway["Edge Layer"]
        GW["Gateway Service\n:8081\nSpring Cloud Gateway"]
    end

    subgraph CoreServices["Core Services"]
        API["API Service\n:8080\nSpring Boot + GraphQL"]
        AuthServer["Authorization Server\n:8082\nOAuth2/OIDC"]
        ExtAPI["External API\n:8083\nSpring Boot REST"]
        StreamSvc["Stream Service\n:8085\nKafka Streams"]
        ClientSvc["Client Service\n:8084\nSpring Boot + NATS"]
    end

    subgraph AgentLayer["Agent Layer"]
        OFClient["openframe-client\n(Rust Agent)\nSystem Service"]
    end

    subgraph DataLayer["Data Layer"]
        Mongo[("MongoDB\nTransactional Storage")]
        Cassandra[("Cassandra\nTime-Series / Logs")]
        Pinot[("Apache Pinot\nReal-Time Analytics")]
        Redis[("Redis\nCache / Sessions")]
        Kafka[("Apache Kafka\nEvent Streaming")]
        NATS[("NATS/JetStream\nAgent Messaging")]
    end

    ChatApp --> GW
    FrontendUI --> GW
    GW --> API
    GW --> AuthServer
    GW --> ExtAPI
    API --> Mongo
    API --> Pinot
    API --> Kafka
    StreamSvc --> Kafka
    StreamSvc --> Cassandra
    StreamSvc --> Pinot
    ClientSvc --> Mongo
    ClientSvc --> NATS
    AuthServer --> Mongo
    OFClient --> NATS
    OFClient --> API
```

---

## Core Components

| Component | Language | Port | Responsibility |
|---|---|---|---|
| **API Service** | Java / Spring Boot 3.3 | 8080 | Internal REST + GraphQL APIs; ticket, dialog, AI settings, tenant management |
| **Authorization Server** | Java / Spring Authorization Server | 8082 | Multi-tenant OAuth2/OIDC; JWT issuance with RSA keys; SSO (Google, Microsoft) |
| **Gateway** | Java / Spring Cloud Gateway | 8081 | Security enforcement, JWT validation, request routing, WebSocket proxy |
| **External API** | Java / Spring Boot | 8083 | Rate-limited public API endpoints with API key management |
| **Stream Service** | Java / Kafka Streams | 8085 | Real-time event normalization, enrichment, Cassandra/Pinot write |
| **Client Service** | Java / Spring Boot + NATS | 8084 | Agent lifecycle management, tool orchestration |
| **openframe-client** | Rust | — | Cross-platform system agent; device registration, tool management, script execution, NATS messaging |
| **openframe-chat** | TypeScript / Tauri + React | 3003 (dev) | Desktop AI chat client (Fae) for end clients; AES-256-GCM token decryption, NATS bridge |
| **openframe-frontend** | TypeScript / Node.js | 3000 | Web-based tenant dashboard (Mingo AI) |
| **openframe-frontend-core** | TypeScript (lib) | — | Shared UI component library; ODS design tokens, chat components, NATS hooks |

---

## Component Relationships

### Service Dependency Graph

```mermaid
graph LR
    subgraph FE["Frontend Clients"]
        Chat["openframe-chat\n(Tauri)"]
        Frontend["openframe-frontend\n(Web)"]
    end

    subgraph Backend["Backend Services"]
        GW["Gateway\n:8081"]
        API["API Service\n:8080"]
        Auth["Auth Server\n:8082"]
        Ext["External API\n:8083"]
        Stream["Stream Service\n:8085"]
        ClientSvc["Client Service\n:8084"]
    end

    subgraph Agent["Agent"]
        OFC["openframe-client\n(Rust)"]
    end

    subgraph Lib["Shared Libraries"]
        CoreLib["openframe-frontend-core\n(TypeScript npm lib)"]
    end

    Chat --> CoreLib
    Frontend --> CoreLib
    Chat --> GW
    Frontend --> GW
    GW --> Auth
    GW --> API
    GW --> Ext
    API --> Stream
    ClientSvc --> NATS[("NATS")]
    OFC --> NATS
    Stream --> Kafka[("Kafka")]
    API --> Kafka
```

---

## Data Flow

### Agent Registration and Authentication

```mermaid
sequenceDiagram
    participant Agent as openframe-client
    participant GW as Gateway
    participant Auth as Auth Server
    participant API as API Service
    participant Mongo as MongoDB
    participant NATS as NATS JetStream

    Agent->>GW: POST /clients/api/agents/register (X-Initial-Key)
    GW->>API: Forward registration request
    API->>Mongo: Persist machine record
    API-->>Agent: {machineId, clientId, clientSecret}
    Agent->>GW: POST /clients/oauth/token (client_credentials)
    GW->>Auth: Forward token request
    Auth->>Mongo: Lookup OAuth2 client
    Auth-->>Agent: JWT access_token + refresh_token
    Agent->>NATS: Subscribe machine.{machineId}.* subjects
    NATS-->>Agent: Tool install / update / script execution messages
```

### Fae Client Chat Flow (openframe-chat)

```mermaid
sequenceDiagram
    participant User as End User
    participant Tauri as Tauri Shell
    participant React as React UI
    participant Rust as Rust NATS Bridge
    participant GW as Gateway
    participant API as API Service
    participant NATS as NATS JetStream

    Tauri->>React: AES-256-GCM decrypted JWT token
    React->>GW: POST /chat/api/v1/dialogs (Bearer JWT)
    GW->>API: Create dialog (tenant-scoped)
    API-->>React: dialogId
    React->>GW: POST /chat/api/v1/messages {dialogId, content}
    GW->>API: Send message
    API->>NATS: Publish to CHAT_CHUNKS stream
    NATS-->>Rust: JetStream ordered consumer chunks
    Rust->>React: Channel<NatsEvent> via Tauri IPC
    React->>React: Merge realtime chunks with history
    React-->>User: Streaming AI response (Fae)
```

### Multi-Tenant OAuth2 Security Flow

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant GW as Gateway
    participant Auth as Auth Server
    participant API as API Service
    participant DB as MongoDB

    Browser->>Auth: OAuth2 login (tenant-scoped PKCE)
    Auth->>DB: Lookup tenant OAuth2 client
    Auth-->>Browser: JWT (tenant_id + RSA signed)
    Browser->>GW: API request with Bearer JWT
    GW->>GW: Validate issuer + RSA signature
    GW->>GW: Attach identity context headers
    GW->>API: Forward with X-Tenant-Id, X-Machine-Id
    API->>API: Enforce tenant isolation filter
    API->>DB: Query with tenantId scope
    DB-->>API: Tenant-scoped results
    API-->>Browser: Response
```

---

## Key Files

| File | Purpose |
|---|---|
| [`clients/openframe-client/src/main.rs`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-client/src/main.rs) | Thin agent entry point — calls `openframe::run()` from openframe-agent-lib |
| [`clients/openframe-client/src/lib.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/lib.rs) | Agent core: wires all services (NATS, auth, registration, execution, update, logging) |
| [`clients/openframe-client/src/service.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/service.rs) | Cross-platform service lifecycle (install/uninstall/run); Windows SCM integration |
| [`clients/openframe-client/src/service_adapter.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/service_adapter.rs) | `CrossPlatformServiceManager`: macOS launchd, Linux systemd, Windows SCM |
| [`clients/openframe-client/src/installation_initial_config_service.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/installation_initial_config_service.rs) | Builds and persists `InitialConfiguration`; resolves mkcert CA in local mode |
| [`clients/openframe-client/src/doctor/mod.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/doctor/mod.rs) | Pre-install + post-install health check runner (`DoctorReport`) |
| [`clients/openframe-client/src/executor/mod.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/executor/mod.rs) | Cross-platform script execution engine (bash, powershell, python, nushell) |
| [`clients/openframe-client/src/listener/execution_listener.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/listener/execution_listener.rs) | Generic NATS core subscription; bounded concurrency, durable result outbox |
| [`clients/openframe-client/src/listener/tool_installation_message_listener.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/listener/tool_installation_message_listener.rs) | JetStream consumer for tool install messages; parks during client update |
| [`clients/openframe-client/src/clients/auth_client.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/clients/auth_client.rs) | OAuth2 `client_credentials` and `refresh_token` flows against the auth server |
| [`clients/openframe-client/src/clients/registration_client.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/clients/registration_client.rs) | `/register` + `/reinstall` with `CLIENT_SECRET_*` error detection |
| [`clients/openframe-client/src/updater.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/updater.rs) | Velopack-based self-update: check → download → apply + restart |
| [`clients/openframe-client/src/logging/nats_streaming.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/logging/nats_streaming.rs) | Batched log shipping to NATS `agents.logs` subject (60s intervals) |
| [`clients/openframe-chat/src/App.tsx`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/App.tsx) | Root React component; QueryClient, FeatureFlags, DebugMode providers |
| [`clients/openframe-chat/src/views/ChatView.tsx`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/views/ChatView.tsx) | Main chat view: ticket list, dialog screen, quick actions, model display, approval handling |
| [`clients/openframe-chat/src/hooks/useChat.ts`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/hooks/useChat.ts) | Core chat state machine: NATS streaming, history merge, approval flow, send/stop |
| [`clients/openframe-chat/src/services/tokenService.ts`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/services/tokenService.ts) | Singleton JWT token manager; Tauri IPC bridge, rotation listener, API URL init |
| [`clients/openframe-chat/src/services/natsTauri.ts`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/services/natsTauri.ts) | `NatsBridgeClient`: Tauri channel fan-out, rAF coalescing, dialog sub/unsub serialization |
| [`clients/openframe-chat/src-tauri/src/lib.rs`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src-tauri/src/lib.rs) | Tauri app shell: tray icon, macOS activation policy, NATS bridge, token watcher wiring |
| [`clients/openframe-chat/src-tauri/src/token_decryption_service.rs`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src-tauri/src/token_decryption_service.rs) | AES-256-GCM decryption of daemon-written token file |
| [`clients/openframe-chat/src-tauri/src/token_watcher.rs`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src-tauri/src/token_watcher.rs) | Polls token file for rotation; emits `token-update` events to WebView |
| [`clients/openframe-chat/src-tauri/src/config_reader.rs`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src-tauri/src/config_reader.rs) | Reads startup config from macOS `defaults`, CLI args, or Windows registry |
| [`clients/openframe-chat/src/hooks/useChatNatsConfig.ts`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/hooks/useChatNatsConfig.ts) | Single source of truth for NATS WS URL builder and pre-reconnect token refresh |
| [`clients/openframe-chat/src/hooks/useApplyAiAppearance.ts`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/hooks/useApplyAiAppearance.ts) | Applies AiSettings theme (DARK/LIGHT/SYSTEM) and accent color CSS vars to `<html>` |
| [`clients/openframe-chat/src/services/aiSettingsService.ts`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-chat/src/services/aiSettingsService.ts) | GraphQL `ChatAiSettings` query: assistant branding, theme, quick actions, effective LLM |
| [`clients/openframe-client/src/config/update_config.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/config/update_config.rs) | All timing/retry/concurrency constants for updates, NATS, and execution |
| [`clients/openframe-client/src/models/mod.rs`](https://github.com/flamingo-stack/openframe-oss-lib/blob/main/clients/openframe-client/src/models/mod.rs) | Central re-export of all domain models (registration, tools, execution, updates) |

---

## Dependencies

The repository consumes `../deps/openframe-oss-lib/` as a monorepo dependency workspace.

### `openframe-frontend-core` (TypeScript npm package `@flamingo-stack/openframe-frontend-core`)

This is the shared UI library consumed by both `openframe-chat` and `openframe-frontend`. The main project uses it as follows:

| Library Feature | How openframe-chat Uses It |
|---|---|
| **`ChatMessageList`** | Renders the Fae dialog stream with `assistantType="fae"` and `approvalVariant="client"` |
| **`useJetStreamDialogSubscription` / `useRealtimeChunkProcessor`** | Core streaming hooks for WS-based NATS in non-Tauri mode |
| **`processHistoricalMessages`** | Transforms raw GraphQL dialog messages into typed `Message[]` with approval callbacks |
| **`mergeHistoryWithRealtime`** | Deduplicates historical (Mongo) messages against live NATS stream chunks |
| **`buildNatsWsUrl`** | Constructs authenticated WebSocket URL for NATS connection |
| **`ChatTicketList`, `MspOrganizationCard`** | Pre-built chat UI surfaces (initial screen, welcome screen) |
| **ODS Tailwind preset** (`tailwind.config.ts`) | Design token cascade; `openframe-chat` extends it via `presets: [openframeCorePreset]` |
| **`deriveHoverColor`, `deriveActiveColor`, `getReadableTextColor`** | Accent color math used by `useApplyAiAppearance` |
| **Toaster, Button, Modal, Input, FileUpload, Textarea** | UI primitives used throughout chat components |
| **`useToast`, `useLocalStorage`** | Utility hooks consumed by `useCreateTicket`, `useWelcomeScreen` |

The library ships two tsup build configurations: a **server-safe** entry (pure types, configs, platform domains — no React) and a **client-side** entry (React components with `"use client"` banner). The `react-embedding-example` in deps shows the embedding pattern used by non-Next.js hosts (Vite + react-router-dom), which mirrors how `openframe-chat` embeds the library in Vite/Tauri.

### `openframe-client` in `../deps/openframe-oss-lib/clients/openframe-client`

The agent implementation lives there as the `openframe-agent-lib` crate; the in-repo `clients/openframe-client` is a thin binary that depends on it via a pinned git tag and calls `openframe::run()`. The library's `build.rs` requires `OPENFRAME_VERSION` at build time (optional tool/agent version env vars can be injected at compile time).

---

## CLI Commands

The `openframe-client` Rust binary exposes the following subcommands:

```bash
openframe-client install \
  --serverUrl <https://your-server> \
  --initialKey <key> \
  --orgId <org-id> \
  [--localMode] \
  [--tag key=value ...]
```

```bash
openframe-client uninstall
```

```bash
openframe-client run
```

```bash
openframe-client doctor
```

### Command Reference

| Command | Requires Admin | Description |
|---|---|---|
| `install` | ✅ | Runs pre-install doctor checks, writes `initial_config.json`, registers agent as OS service |
| `uninstall` | ✅ | Stops and removes the system service, cleans up registration |
| `run` | — | Runs the agent directly in the foreground (non-service mode, for debugging) |
| `run-as-service` | — | Hidden; invoked by the OS service manager (launchd / systemd / SCM) |
| `check-permissions` | — | Hidden; verifies admin capability for the current process |
| `doctor` | ✅ | Reads installed config, checks connectivity and disk, prints `[+]`/`[x]`/`[!]` report |

### Doctor Check Categories

```text
[+] Pass    [x] Fail    [!] Warn    [i] Info

Pre-install checks:
  Command   — all required CLI args present
  Admin     — running as root/Administrator
  Disk      — install path writable, 200MB free, log/secured dirs writable
  Network   — DNS resolves server URL, TCP connects :443, HTTPS handshake succeeds

Health check (post-install):
  Command   — initial_config.json readable, server_host present
  Admin     — elevated privileges
  Network   — same DNS/TCP/TLS checks against persisted server_host
```

### Install Flags

| Flag | Required | Description |
|---|---|---|
| `--serverUrl` | ✅ | Base URL of the OpenFrame server (e.g. `https://tenant.openframe.example`) |
| `--initialKey` | ✅ | One-time registration key issued by the tenant admin |
| `--orgId` | ✅ | Organization ID the device belongs to |
| `--localMode` | — | Enables mkcert CA resolution for local TLS (dev environments) |
| `--tag key=value` | — | Repeatable; assigns device tags (e.g. `--tag site=CHICAGO --tag env=prod`) |

---

## Community & Links

- **Community (Slack):** [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Platform:** [flamingo.run](https://flamingo.run)
- **OpenFrame Product:** [flamingo.run/openframe](https://www.flamingo.run/openframe)
- **OpenMSP:** [openmsp.ai](https://www.openmsp.ai/)
- **Repository:** [flamingo-stack/openframe-oss-tenant](https://github.com/flamingo-stack/openframe-oss-tenant)
- **Issues / PRs:** [github.com/flamingo-stack/openframe-oss-tenant/pulls](https://github.com/flamingo-stack/openframe-oss-tenant/pulls)
- **Releases:** [github.com/flamingo-stack/openframe-oss-tenant/releases](https://github.com/flamingo-stack/openframe-oss-tenant/releases)
