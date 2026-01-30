# OpenFrame Frontend - Architecture Diagrams

## 📐 Visual Architecture Reference

This document provides comprehensive visual diagrams for the OpenFrame Frontend architecture, data flows, and system interactions.

---

## 🏗️ System Architecture

### Complete System Overview

```mermaid
flowchart TB
    subgraph browser["🌐 Browser Layer"]
        UI["React UI Components<br/>(Next.js 14)"]
        Router["App Router<br/>(File-based Routing)"]
    end
    
    subgraph state["💾 State Management Layer"]
        AuthStore["Auth Store<br/>(User, Tokens, Tenant)"]
        DeviceStore["Device Store<br/>(Devices, Filters)"]
        LogsStore["Logs Store<br/>(Logs, Pagination)"]
        DialogStore["Dialog Store<br/>(Tickets, Messages)"]
        MingoStore["Mingo Store<br/>(AI Conversations)"]
    end
    
    subgraph hooks["🎣 Custom Hooks Layer"]
        UseAuth["useAuth<br/>(Authentication)"]
        UseDevices["useDevices<br/>(Device Management)"]
        UseLogs["useLogs<br/>(Log Streaming)"]
        UseDialogs["useDialogs<br/>(Support Tickets)"]
        UseMingo["useMingo<br/>(AI Assistant)"]
    end
    
    subgraph clients["🔌 API Client Layer"]
        BaseClient["ApiClient<br/>(Base HTTP Client)"]
        AuthClient["AuthApiClient<br/>(Auth Endpoints)"]
        FleetClient["FleetApiClient<br/>(Fleet MDM)"]
        TacticalClient["TacticalApiClient<br/>(Tactical RMM)"]
    end
    
    subgraph backend["☁️ Backend Services"]
        Gateway["API Gateway<br/>(Port 8080)"]
        AuthServer["Authorization Server<br/>(Port 9000)"]
        APIService["API Service<br/>(Port 8081)"]
        ChatService["Chat Service<br/>(Port 8082)"]
    end
    
    subgraph external["🔧 External Tools"]
        FleetMDM["Fleet MDM"]
        TacticalRMM["Tactical RMM"]
        MeshCentral["MeshCentral"]
    end
    
    UI --> Router
    Router --> hooks
    hooks --> state
    hooks --> clients
    
    UseAuth --> AuthStore
    UseDevices --> DeviceStore
    UseLogs --> LogsStore
    UseDialogs --> DialogStore
    UseMingo --> MingoStore
    
    BaseClient --> Gateway
    AuthClient --> Gateway
    FleetClient --> Gateway
    TacticalClient --> Gateway
    
    Gateway --> AuthServer
    Gateway --> APIService
    Gateway --> ChatService
    Gateway --> FleetMDM
    Gateway --> TacticalRMM
    
    UI -.->|"Direct WebSocket"| MeshCentral
    
    style UI fill:#4CAF50
    style state fill:#2196F3
    style clients fill:#FF9800
    style Gateway fill:#9C27B0
```

---

## 🔐 Authentication Architecture

### Multi-Tenant Authentication Flow

```mermaid
flowchart TD
    Start["User Visits Application"] --> CheckMode{"Deployment Mode?"}
    
    CheckMode -->|"SaaS Shared"| SharedFlow["Shared Host Flow"]
    CheckMode -->|"SaaS Tenant"| TenantFlow["Tenant Host Flow"]
    CheckMode -->|"Self-Hosted"| SelfHostedFlow["Self-Hosted Flow"]
    
    SharedFlow --> DiscoverTenant["Discover Tenant by Email"]
    TenantFlow --> CheckAuth["Check Authentication"]
    SelfHostedFlow --> CheckAuth
    
    DiscoverTenant --> HasAccount{"Has Account?"}
    HasAccount -->|"yes"| ShowProviders["Show Auth Providers"]
    HasAccount -->|"no"| RegisterOrg["Register Organization"]
    
    ShowProviders --> ChooseProvider{"Choose Provider"}
    ChooseProvider -->|"SSO"| SSOFlow["SSO OAuth Flow"]
    ChooseProvider -->|"Password"| PasswordFlow["Password Login"]
    
    SSOFlow --> OAuthRedirect["Redirect to Provider"]
    OAuthRedirect --> OAuthCallback["OAuth Callback"]
    OAuthCallback --> SetSession["Set Session Cookie"]
    
    PasswordFlow --> ValidatePassword["Validate Credentials"]
    ValidatePassword --> SetSession
    
    RegisterOrg --> RegistrationComplete["Registration Complete"]
    RegistrationComplete --> ShowProviders
    
    CheckAuth --> IsAuthenticated{"Authenticated?"}
    IsAuthenticated -->|"yes"| LoadProfile["Load User Profile"]
    IsAuthenticated -->|"no"| ShowLogin["Show Login Page"]
    
    ShowLogin --> DiscoverTenant
    SetSession --> LoadProfile
    LoadProfile --> Dashboard["Redirect to Dashboard"]
    
    style Start fill:#4CAF50
    style Dashboard fill:#2196F3
    style SetSession fill:#FF9800
```

### Token Refresh Mechanism

```mermaid
sequenceDiagram
    participant Component
    participant APIClient
    participant TokenStorage
    participant Gateway
    participant AuthServer
    
    Component->>APIClient: API Request
    APIClient->>TokenStorage: Get Access Token
    TokenStorage-->>APIClient: Access Token
    
    APIClient->>Gateway: Request + Bearer Token
    
    alt Token Valid
        Gateway-->>APIClient: 200 OK + Data
        APIClient-->>Component: Success Response
    else Token Expired (401)
        Gateway-->>APIClient: 401 Unauthorized
        
        APIClient->>APIClient: Check if Already Refreshing
        
        alt Not Refreshing
            APIClient->>APIClient: Set Refreshing Flag
            APIClient->>TokenStorage: Get Refresh Token
            TokenStorage-->>APIClient: Refresh Token
            
            APIClient->>AuthServer: POST /oauth/refresh
            AuthServer-->>APIClient: New Access Token
            
            APIClient->>TokenStorage: Store New Token
            APIClient->>APIClient: Clear Refreshing Flag
            APIClient->>APIClient: Process Queued Requests
            
            APIClient->>Gateway: Retry Original Request
            Gateway-->>APIClient: 200 OK + Data
            APIClient-->>Component: Success Response
        else Already Refreshing
            APIClient->>APIClient: Queue Request
            APIClient->>APIClient: Wait for Refresh
            APIClient->>Gateway: Retry Request
            Gateway-->>APIClient: 200 OK + Data
            APIClient-->>Component: Success Response
        end
    else Refresh Failed
        APIClient->>TokenStorage: Clear All Tokens
        APIClient->>Component: Force Logout
        Component->>Component: Redirect to Login
    end
```

---

## 📊 Data Flow Architecture

### Device Data Aggregation

```mermaid
flowchart LR
    subgraph frontend["Frontend"]
        DeviceList["Device List View"]
        DeviceDetail["Device Detail View"]
    end
    
    subgraph api_layer["API Layer"]
        GraphQL["GraphQL Query"]
        APIClient["API Client"]
    end
    
    subgraph backend["Backend Services"]
        Gateway["API Gateway"]
        APIService["API Service"]
    end
    
    subgraph data_sources["Data Sources"]
        MongoDB["MongoDB<br/>(Core Data)"]
        FleetMDM["Fleet MDM<br/>(Policies, Queries)"]
        TacticalRMM["Tactical RMM<br/>(Scripts, Checks)"]
        Pinot["Apache Pinot<br/>(Time-Series)"]
    end
    
    DeviceList -->|"fetch devices"| GraphQL
    DeviceDetail -->|"fetch device details"| GraphQL
    
    GraphQL --> APIClient
    APIClient --> Gateway
    Gateway --> APIService
    
    APIService --> MongoDB
    APIService --> FleetMDM
    APIService --> TacticalRMM
    APIService --> Pinot
    
    MongoDB -->|"base device data"| APIService
    FleetMDM -->|"Fleet-specific data"| APIService
    TacticalRMM -->|"Tactical-specific data"| APIService
    Pinot -->|"analytics data"| APIService
    
    APIService -->|"unified device model"| Gateway
    Gateway --> APIClient
    APIClient --> DeviceList
    APIClient --> DeviceDetail
    
    style DeviceList fill:#4CAF50
    style APIService fill:#2196F3
    style MongoDB fill:#FF9800
```

### Log Streaming Flow

```mermaid
flowchart TD
    subgraph frontend["Frontend"]
        LogsPage["Logs Page"]
        LogsStore["Logs Store<br/>(Zustand)"]
    end
    
    subgraph api["API Layer"]
        GraphQLQuery["GraphQL Query<br/>(Cursor Pagination)"]
        APIClient["API Client"]
    end
    
    subgraph backend["Backend"]
        Gateway["API Gateway"]
        APIService["API Service"]
        StreamService["Stream Processing"]
    end
    
    subgraph data["Data Layer"]
        Pinot["Apache Pinot<br/>(Log Storage)"]
        Kafka["Kafka<br/>(Real-time Stream)"]
    end
    
    LogsPage -->|"initial load"| GraphQLQuery
    GraphQLQuery --> APIClient
    APIClient --> Gateway
    Gateway --> APIService
    
    APIService --> Pinot
    Pinot -->|"historical logs"| APIService
    
    APIService --> Gateway
    Gateway --> APIClient
    APIClient --> LogsStore
    LogsStore --> LogsPage
    
    LogsPage -->|"scroll to bottom"| GraphQLQuery
    GraphQLQuery -->|"next cursor"| APIClient
    
    StreamService --> Kafka
    Kafka -->|"new logs"| Pinot
    
    LogsPage -.->|"WebSocket (future)"| StreamService
    StreamService -.->|"real-time updates"| LogsPage
    
    style LogsPage fill:#4CAF50
    style LogsStore fill:#2196F3
    style Pinot fill:#FF9800
```

### Support Ticket Real-Time Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant DialogStore
    participant WebSocket
    participant ChatService
    participant MingoAI
    
    User->>Frontend: Open Ticket
    Frontend->>DialogStore: Load Dialog
    DialogStore->>ChatService: GET /dialogs/:id
    ChatService-->>DialogStore: Dialog Data
    DialogStore-->>Frontend: Render Ticket
    
    Frontend->>WebSocket: Connect to Dialog
    WebSocket->>ChatService: Subscribe to Dialog
    
    User->>Frontend: Type Message
    Frontend->>DialogStore: Set Typing Indicator
    DialogStore->>WebSocket: Send Typing Event
    WebSocket->>ChatService: Broadcast Typing
    
    User->>Frontend: Send Message
    Frontend->>DialogStore: Add Message (Optimistic)
    DialogStore->>ChatService: POST /messages
    ChatService-->>DialogStore: Message Confirmed
    
    ChatService->>MingoAI: Process Message
    MingoAI->>MingoAI: Generate Response
    
    MingoAI-->>ChatService: AI Response (Streaming)
    ChatService->>WebSocket: Stream Response
    WebSocket->>DialogStore: Update Message
    DialogStore->>Frontend: Render Streaming Response
    Frontend->>User: Show AI Response
    
    Note over Frontend,ChatService: Real-time bidirectional communication
```

---

## 🔄 State Management Architecture

### Zustand Store Organization

```mermaid
flowchart TB
    subgraph global["Global Stores"]
        AuthStore["Auth Store<br/>- user<br/>- tokens<br/>- tenantId"]
        RuntimeConfig["Runtime Config<br/>- env variables<br/>- feature flags"]
    end
    
    subgraph feature["Feature Stores"]
        DeviceStore["Device Store<br/>- devices<br/>- filters<br/>- pagination"]
        LogsStore["Logs Store<br/>- logs<br/>- search<br/>- pageInfo"]
        DialogsStore["Dialogs Store<br/>- dialogs<br/>- filters<br/>- pagination"]
        DialogDetailsStore["Dialog Details Store<br/>- currentDialog<br/>- messages<br/>- typing"]
        MingoStore["Mingo Store<br/>- conversations<br/>- background tasks"]
    end
    
    subgraph persistence["Persistence"]
        LocalStorage["localStorage<br/>- tokens<br/>- user<br/>- filters"]
        SessionStorage["sessionStorage<br/>- cache<br/>- temp data"]
        Cookies["HTTP Cookies<br/>- session<br/>- CSRF token"]
    end
    
    AuthStore <-->|"tokens, user"| LocalStorage
    AuthStore <-->|"session"| Cookies
    RuntimeConfig <-->|"config"| LocalStorage
    
    DeviceStore -->|"cache"| SessionStorage
    LogsStore -->|"filters"| LocalStorage
    DialogsStore -->|"cache"| SessionStorage
    
    style AuthStore fill:#4CAF50
    style feature fill:#2196F3
    style persistence fill:#FF9800
```

### Component-Store-API Pattern

```mermaid
flowchart LR
    subgraph ui["UI Layer"]
        Component["React Component"]
    end
    
    subgraph logic["Business Logic"]
        Hook["Custom Hook<br/>(useDevices)"]
        Store["Zustand Store<br/>(DeviceStore)"]
    end
    
    subgraph api["API Layer"]
        APIClient["API Client"]
        Backend["Backend Service"]
    end
    
    Component -->|"1. call hook"| Hook
    Hook -->|"2. read state"| Store
    Store -->|"3. return data"| Hook
    Hook -->|"4. render"| Component
    
    Component -->|"5. user action"| Hook
    Hook -->|"6. API call"| APIClient
    APIClient -->|"7. HTTP request"| Backend
    Backend -->|"8. response"| APIClient
    APIClient -->|"9. update state"| Store
    Store -->|"10. reactive update"| Component
    
    style Component fill:#4CAF50
    style Store fill:#2196F3
    style APIClient fill:#FF9800
```

---

## 🌐 Deployment Architecture

### SaaS Shared Mode

```mermaid
flowchart TB
    subgraph internet["Internet"]
        User1["User (Tenant A)"]
        User2["User (Tenant B)"]
    end
    
    subgraph cdn["CDN Layer"]
        CloudFlare["CloudFlare<br/>(Static Assets)"]
    end
    
    subgraph frontend["Frontend Layer"]
        NextJS["Next.js App<br/>(Shared Instance)"]
    end
    
    subgraph backend["Backend Layer"]
        Gateway["API Gateway<br/>(Shared)"]
        AuthServer["Auth Server<br/>(Shared)"]
        Services["Microservices<br/>(Multi-tenant)"]
    end
    
    subgraph data["Data Layer"]
        MongoDB["MongoDB<br/>(Tenant Isolation)"]
        Pinot["Apache Pinot<br/>(Tenant Partitioning)"]
    end
    
    User1 -->|"tenant-a.openframe.ai"| CloudFlare
    User2 -->|"tenant-b.openframe.ai"| CloudFlare
    
    CloudFlare --> NextJS
    NextJS --> Gateway
    Gateway --> AuthServer
    Gateway --> Services
    
    Services --> MongoDB
    Services --> Pinot
    
    style NextJS fill:#4CAF50
    style Gateway fill:#2196F3
    style MongoDB fill:#FF9800
```

### Self-Hosted Mode

```mermaid
flowchart TB
    subgraph onprem["On-Premises Network"]
        User["Internal Users"]
        
        subgraph frontend["Frontend"]
            NextJS["Next.js App<br/>(Single Tenant)"]
        end
        
        subgraph backend["Backend Services"]
            Gateway["API Gateway"]
            AuthServer["Auth Server"]
            APIService["API Service"]
            ChatService["Chat Service"]
        end
        
        subgraph data["Data Layer"]
            MongoDB["MongoDB"]
            Pinot["Apache Pinot"]
            Kafka["Kafka"]
        end
        
        subgraph tools["Management Tools"]
            Fleet["Fleet MDM"]
            Tactical["Tactical RMM"]
            Mesh["MeshCentral"]
        end
    end
    
    User --> NextJS
    NextJS --> Gateway
    Gateway --> AuthServer
    Gateway --> APIService
    Gateway --> ChatService
    Gateway --> Fleet
    Gateway --> Tactical
    
    APIService --> MongoDB
    APIService --> Pinot
    ChatService --> MongoDB
    
    Kafka --> Pinot
    
    NextJS -.->|"Direct WebSocket"| Mesh
    
    style NextJS fill:#4CAF50
    style Gateway fill:#2196F3
    style MongoDB fill:#FF9800
```

---

## 🔌 Integration Architecture

### External Tool Integration

```mermaid
flowchart LR
    subgraph frontend["Frontend"]
        DeviceUI["Device UI"]
        FleetClient["Fleet API Client"]
        TacticalClient["Tactical API Client"]
        MeshClient["Mesh Client"]
    end
    
    subgraph gateway["Gateway Layer"]
        APIGateway["API Gateway<br/>(Proxy)"]
    end
    
    subgraph tools["External Tools"]
        FleetMDM["Fleet MDM<br/>(REST API)"]
        TacticalRMM["Tactical RMM<br/>(REST API)"]
        MeshCentral["MeshCentral<br/>(WebSocket)"]
    end
    
    DeviceUI --> FleetClient
    DeviceUI --> TacticalClient
    DeviceUI --> MeshClient
    
    FleetClient --> APIGateway
    TacticalClient --> APIGateway
    
    APIGateway -->|"/tools/fleetmdm-server/*"| FleetMDM
    APIGateway -->|"/tools/tactical-rmm/*"| TacticalRMM
    
    MeshClient -.->|"Direct WebSocket"| MeshCentral
    
    FleetMDM -->|"device data"| APIGateway
    TacticalRMM -->|"agent data"| APIGateway
    MeshCentral -.->|"remote access"| MeshClient
    
    style DeviceUI fill:#4CAF50
    style APIGateway fill:#2196F3
    style tools fill:#FF9800
```

### WebSocket Communication

```mermaid
sequenceDiagram
    participant Frontend
    participant WebSocket
    participant ChatService
    participant MingoAI
    
    Frontend->>WebSocket: Connect
    WebSocket->>ChatService: Establish Connection
    ChatService-->>WebSocket: Connection Confirmed
    WebSocket-->>Frontend: Connected
    
    Frontend->>WebSocket: Subscribe to Dialog
    WebSocket->>ChatService: Subscribe Request
    ChatService-->>WebSocket: Subscription Confirmed
    
    loop Real-time Updates
        ChatService->>WebSocket: New Message Event
        WebSocket->>Frontend: Push Message
        Frontend->>Frontend: Update UI
        
        Frontend->>WebSocket: Typing Indicator
        WebSocket->>ChatService: Broadcast Typing
        ChatService->>WebSocket: Typing Event
        WebSocket->>Frontend: Show Typing
    end
    
    Frontend->>WebSocket: Send Message
    WebSocket->>ChatService: Message Data
    ChatService->>MingoAI: Process Message
    
    loop Streaming Response
        MingoAI-->>ChatService: Response Chunk
        ChatService->>WebSocket: Stream Chunk
        WebSocket->>Frontend: Update Message
        Frontend->>Frontend: Render Chunk
    end
    
    Frontend->>WebSocket: Disconnect
    WebSocket->>ChatService: Close Connection
    ChatService-->>WebSocket: Disconnected
```

---

## 🔒 Security Architecture

### Authentication Security Layers

```mermaid
flowchart TD
    subgraph client["Client Layer"]
        Browser["Browser"]
        LocalStorage["localStorage<br/>(Dev Mode Only)"]
        Cookies["HTTP-only Cookies<br/>(Production)"]
    end
    
    subgraph transport["Transport Layer"]
        HTTPS["HTTPS/TLS 1.3"]
        CSP["Content Security Policy"]
        CORS["CORS Headers"]
    end
    
    subgraph application["Application Layer"]
        TokenValidation["Token Validation"]
        SessionCheck["Session Check"]
        CSRF["CSRF Protection"]
    end
    
    subgraph backend["Backend Layer"]
        Gateway["API Gateway<br/>(Rate Limiting)"]
        AuthServer["Auth Server<br/>(OAuth 2.0)"]
        JWT["JWT Validation"]
    end
    
    Browser --> HTTPS
    LocalStorage -.->|"dev mode"| Browser
    Cookies -->|"production"| Browser
    
    HTTPS --> CSP
    CSP --> CORS
    CORS --> TokenValidation
    
    TokenValidation --> SessionCheck
    SessionCheck --> CSRF
    
    CSRF --> Gateway
    Gateway --> AuthServer
    AuthServer --> JWT
    
    style Browser fill:#4CAF50
    style HTTPS fill:#2196F3
    style Gateway fill:#FF9800
    style JWT fill:#9C27B0
```

---

## 📈 Performance Architecture

### Optimization Layers

```mermaid
flowchart TB
    subgraph cdn["CDN Layer"]
        CloudFlare["CloudFlare<br/>(Edge Caching)"]
    end
    
    subgraph frontend["Frontend Layer"]
        CodeSplitting["Code Splitting<br/>(Route-based)"]
        LazyLoading["Lazy Loading<br/>(Components)"]
        Memoization["Memoization<br/>(React.memo)"]
    end
    
    subgraph state["State Layer"]
        VirtualScrolling["Virtual Scrolling<br/>(Large Lists)"]
        Debouncing["Debouncing<br/>(Search, Filters)"]
        Caching["Client-side Caching<br/>(localStorage)"]
    end
    
    subgraph api["API Layer"]
        RequestBatching["Request Batching"]
        ResponseCaching["Response Caching"]
        Compression["Gzip Compression"]
    end
    
    subgraph backend["Backend Layer"]
        LoadBalancing["Load Balancing"]
        DatabaseIndexing["Database Indexing"]
        QueryOptimization["Query Optimization"]
    end
    
    CloudFlare --> CodeSplitting
    CodeSplitting --> LazyLoading
    LazyLoading --> Memoization
    
    Memoization --> VirtualScrolling
    VirtualScrolling --> Debouncing
    Debouncing --> Caching
    
    Caching --> RequestBatching
    RequestBatching --> ResponseCaching
    ResponseCaching --> Compression
    
    Compression --> LoadBalancing
    LoadBalancing --> DatabaseIndexing
    DatabaseIndexing --> QueryOptimization
    
    style CloudFlare fill:#4CAF50
    style frontend fill:#2196F3
    style api fill:#FF9800
    style backend fill:#9C27B0
```

---

## 🎯 Component Hierarchy

### Main Application Structure

```mermaid
flowchart TD
    App["App Root<br/>(layout.tsx)"]
    
    App --> Auth["Auth Pages<br/>(/auth/*)"]
    App --> Dashboard["Dashboard<br/>(/dashboard)"]
    App --> Devices["Devices<br/>(/devices)"]
    App --> Logs["Logs<br/>(/logs)"]
    App --> Tickets["Tickets<br/>(/tickets)"]
    App --> Mingo["Mingo AI<br/>(/mingo)"]
    
    Auth --> Login["Login Page"]
    Auth --> Register["Register Page"]
    Auth --> Invite["Invite Page"]
    
    Dashboard --> Overview["Overview"]
    Dashboard --> Stats["Statistics"]
    
    Devices --> DeviceList["Device List"]
    Devices --> DeviceDetail["Device Detail"]
    DeviceDetail --> RemoteAccess["Remote Access"]
    
    Logs --> LogList["Log List"]
    Logs --> LogDetail["Log Detail"]
    
    Tickets --> TicketList["Ticket List"]
    Tickets --> TicketDetail["Ticket Detail"]
    TicketDetail --> Chat["Chat Interface"]
    
    Mingo --> MingoChat["Mingo Chat"]
    Mingo --> MingoHistory["Conversation History"]
    
    style App fill:#4CAF50
    style Dashboard fill:#2196F3
    style Devices fill:#FF9800
    style Tickets fill:#9C27B0
```

---

## 📚 Related Documentation

- **[Main Documentation](./frontend_main.md)** - Complete architecture overview
- **[Getting Started](./FRONTEND_MAIN_README.md)** - Setup and installation
- **[Executive Summary](./FRONTEND_MAIN_SUMMARY.md)** - High-level overview
- **[Documentation Index](./FRONTEND_DOCUMENTATION_INDEX.md)** - Complete documentation map

---

**Last Updated**: 2024  
**Version**: 1.0  
**Maintained by**: Flamingo Team
