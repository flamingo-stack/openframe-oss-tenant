# Frontend Tenant App Core

## Overview

The **Frontend Tenant App Core** module is the primary web application for tenant users within the OpenFrame platform. It is responsible for:

- User authentication and tenant discovery
- Device and endpoint management UI
- AI-powered assistant interactions (Mingo)
- Ticket and dialog management via GraphQL
- Integration with Fleet MDM, Tactical RMM, and MeshCentral
- Centralized API communication and token lifecycle handling

This module is built with **Next.js (App Router)**, **React**, **Zustand** for state management, and **React Query** for server state synchronization. It acts as the presentation and orchestration layer over backend services such as the API Service Core, Authorization Server Core, Gateway Service Core, and tool-specific services.

---

## High-Level Architecture

```mermaid
flowchart TD
    Browser["Tenant User Browser"] --> App["Frontend Tenant App Core"]

    App --> AuthClient["AuthApiClient"]
    App --> ApiClient["ApiClient"]
    App --> FleetClient["FleetApiClient"]
    App --> TacticalClient["TacticalApiClient"]
    App --> MeshDesktop["MeshDesktop"]

    AuthClient --> AuthServer["Authorization Server"]
    ApiClient --> Gateway["Gateway Service"]
    FleetClient --> FleetTool["Fleet MDM Tool"]
    TacticalClient --> TacticalTool["Tactical RMM Tool"]
    MeshDesktop --> MeshServer["MeshCentral Server"]

    Gateway --> ApiService["API Service Core"]
    ApiService --> DataLayer["Data & Stream Services"]
```

### Responsibilities by Layer

- **Frontend Tenant App Core**: UI, routing, state management, user experience.
- **AuthApiClient**: OAuth, SSO, registration, invitation, password reset.
- **ApiClient**: Authenticated REST + GraphQL communication with backend APIs.
- **FleetApiClient / TacticalApiClient**: Tool-specific proxy communication.
- **MeshDesktop**: Real-time remote desktop rendering over binary WebSocket protocol.

---

## Core Functional Domains

### 1. Authentication & Tenant Lifecycle

Key elements:

- `useAuth` hook
- `AuthApiClient`
- `TenantInfo` interface
- SSO provider discovery hooks

The authentication flow supports:

- Tenant discovery by email
- Organization registration (password or SSO)
- OAuth login via external providers (Google, Microsoft)
- Token storage (access + refresh)
- Automatic refresh and forced logout handling

```mermaid
sequenceDiagram
    participant User
    participant App as "Frontend App"
    participant Auth as "AuthApiClient"
    participant Server as "Authorization Server"

    User->>App: Enter email
    App->>Auth: discoverTenants(email)
    Auth->>Server: GET /sas/tenant/discover
    Server-->>Auth: TenantDiscoveryResponse
    Auth-->>App: Providers + tenantId
    User->>App: Login with SSO
    App->>Auth: Redirect to /oauth/login
    Server-->>User: OAuth callback
    App->>Server: /api/me
    Server-->>App: Authenticated user
```

### Token Handling Strategy

- Access tokens stored under `of_access_token`
- Refresh tokens stored under `of_refresh_token`
- `ApiClient` automatically:
  - Attaches `Authorization` header in DevTicket mode
  - Attempts refresh on `401`
  - Queues concurrent requests during refresh
  - Forces logout on refresh failure

This ensures consistent authentication across all service integrations.

---

### 2. Deployment Detection

The `useDeployment` hook determines runtime mode:

- Cloud
- Self-hosted
- Development

It uses a global Zustand store (`DeploymentState`) to ensure detection runs once and is reused across the application.

```mermaid
flowchart LR
    Hook["useDeployment"] --> Store["Zustand Deployment Store"]
    Store --> Detector["detectDeployment()"]
    Detector --> Result["DeploymentInfo"]
```

This influences:

- Auth redirect behavior
- API base URL resolution
- Feature flags and environment assumptions

---

### 3. Device Domain Model

The `Device` interface provides a **unified device representation** with:

- Hardware specs
- OS details
- Network information
- Software inventory
- Vulnerabilities
- Tags
- Tool connections
- Installed agents

Design principles:

- All fields flattened at root level
- No deep nesting
- Backward compatibility with legacy tool formats
- Shared GraphQL node mappings

```mermaid
flowchart TD
    Device["Device"] --> Hardware["CPU / Memory / Disk"]
    Device --> Network["IP / MAC / Public IP"]
    Device --> OS["Platform / Version"]
    Device --> Tags["DeviceTag[]"]
    Device --> Tools["ToolConnection[]"]
    Device --> Agents["InstalledAgent[]"]
    Device --> Software["Software[]"]
```

This model bridges:

- Fleet MDM
- Tactical RMM
- Internal API device representations

---

### 4. Mingo AI Chat Integration

Mingo provides AI-assisted operations within the tenant interface.

Core components:

- `useMingoDialog`
- `MingoApiService`
- `MingoMessagesStore`
- Dialog & Message GraphQL types

#### Dialog Creation & Messaging

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Api as "ApiClient"
    participant Chat as "Chat Service"

    User->>UI: Send message
    UI->>Api: POST /chat/api/v1/messages
    Api->>Chat: Forward message
    Chat-->>Api: Stream segments
    Api-->>UI: Message segments
```

#### State Management

`MingoMessagesStore` (Zustand) manages:

- Messages per dialog
- Streaming partial responses
- Approval requests
- Typing indicators
- Unread counts
- Segment accumulation

```mermaid
flowchart TD
    UI["Chat UI"] --> Store["MingoMessagesStore"]
    Store --> Streaming["Streaming Messages"]
    Store --> Accumulator["Segment Accumulator"]
    Store --> Unread["Unread Counters"]
```

Segment accumulation allows:

- Incremental text rendering
- Tool execution blocks
- Approval request rendering
- Status updates (approved / rejected)

---

### 5. Ticket & Dialog GraphQL Layer

The tickets domain integrates via `/chat/graphql`.

Hooks:

- `useDialogsQuery`
- `useDialogMessages`
- `useDialogDetails`

Patterns:

- Cursor-based pagination
- React Query caching
- GraphQL response envelope validation

```mermaid
flowchart LR
    Hook["useDialogsQuery"] --> Api["ApiClient"]
    Api --> GraphQL["/chat/graphql"]
    GraphQL --> DialogConnection["DialogConnection"]
```

The `DialogDetailsStore` centralizes:

- Active dialog state
- Client vs admin messages
- Realtime updates
- Polling for new messages

---

### 6. Tool Integrations

#### Fleet API Client

- Base path: `/tools/fleetmdm-server`
- Policies
- Queries
- Hosts
- Labels
- Packs

#### Tactical API Client

- Base path: `/tools/tactical-rmm`
- Agents
- Scripts
- Tasks
- Logs
- System info

```mermaid
flowchart TD
    Frontend["Frontend Tenant App Core"] --> Fleet["FleetApiClient"]
    Frontend --> Tactical["TacticalApiClient"]

    Fleet --> FleetServer["Fleet MDM Backend"]
    Tactical --> TacticalServer["Tactical RMM Backend"]
```

These clients reuse the shared `ApiClient` for:

- Authentication
- Error handling
- Retry logic
- Refresh handling

---

### 7. MeshCentral Remote Desktop

The `MeshDesktop` class implements a binary protocol client for remote desktop streaming.

Responsibilities:

- Canvas rendering
- JPEG tile decoding
- Keyboard & mouse encoding
- Multi-display handling
- Frame accumulation buffer

```mermaid
flowchart TD
    WebSocket["Binary WebSocket"] --> Decoder["Frame Parser"]
    Decoder --> TileQueue["Tile Queue"]
    TileQueue --> Bitmap["ImageBitmap Decode"]
    Bitmap --> Canvas["Canvas Render"]
```

Advanced capabilities:

- Jumbo frame handling
- Backpressure queue limits
- Concurrent decode caps
- Display switching
- Ctrl+Alt+Del command support

This component enables full remote control directly in-browser.

---

## Cross-Cutting Concerns

### 1. State Management

- **Zustand**: Global UI state (auth, deployment, dialogs, chat).
- **React Query**: Server state, caching, pagination.
- **LocalStorage hooks**: Persistent auth and discovery state.

### 2. Error Handling

- Toast notifications for user-facing errors
- Centralized refresh and forced logout logic
- GraphQL error envelope validation

### 3. Environment Awareness

`runtimeEnv` drives:

- Shared host URL
- Dev ticket observer mode
- Auth check intervals
- SaaS shared mode logic

---

## End-to-End Data Flow

```mermaid
flowchart TD
    User["Tenant User"] --> UI["React UI"]
    UI --> Clients["API Clients"]
    Clients --> Gateway["Gateway Service"]
    Gateway --> Backend["Backend Services"]
    Backend --> Data["Mongo / Kafka / Stream"]
    Data --> Backend
    Backend --> Gateway
    Gateway --> UI
```

The Frontend Tenant App Core acts as:

- A UI orchestration layer
- An authentication boundary
- A tool integration gateway
- An AI interaction surface

It is the primary tenant-facing surface of the OpenFrame platform and ties together authentication, device management, AI operations, and remote control into a cohesive experience.

---

## Summary

The **Frontend Tenant App Core** module:

- Implements full tenant authentication and lifecycle flows
- Unifies device representations across multiple tools
- Provides AI-powered dialog management via Mingo
- Integrates GraphQL ticketing and real-time updates
- Handles secure token refresh and session lifecycle
- Enables browser-based remote desktop control

It is the central presentation and orchestration layer of the tenant experience in the OpenFrame ecosystem.