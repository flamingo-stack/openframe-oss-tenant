# Frontend Chat Module - Visual Overview

## Complete System Architecture

This document provides comprehensive visual diagrams for the Frontend Chat Module architecture, data flows, and component interactions.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Desktop["Desktop Application (Tauri)"]
        subgraph Rust["Rust Backend Layer"]
            TokenMgr["Token Manager<br/>(Secure Storage)"]
            ConfigMgr["Configuration Manager<br/>(Settings)"]
            EventBus["Event Bus<br/>(Rust ↔ JS)"]
        end
        
        subgraph React["React Frontend Layer"]
            subgraph Contexts["Context Providers"]
                DebugCtx["Debug Mode Context"]
            end
            
            subgraph Services["Service Layer"]
                TokenSvc["Token Service"]
                DialogSvc["Dialog GraphQL Service"]
                ModelsSvc["Supported Models Service"]
                MockSvc["Mock Chat Service"]
            end
            
            subgraph UI["UI Components"]
                ChatContainer["Chat Container"]
                MessageList["Message List"]
                InputArea["Input Area"]
                ToolDisplay["Tool Execution Display"]
            end
        end
    end
    
    subgraph Backend["OpenFrame Backend Services"]
        Gateway["Gateway Service<br/>(API Router)"]
        
        subgraph APIs["API Services"]
            AuthzAPI["Authorization Service<br/>(JWT Tokens)"]
            ChatAPI["Chat API<br/>(GraphQL)"]
            ExternalAPI["External API<br/>(REST)"]
        end
    end
    
    TokenMgr -->|"token-update events"| EventBus
    ConfigMgr -->|"get_server_url()"| EventBus
    EventBus -->|"Events & Commands"| TokenSvc
    
    TokenSvc -->|"Provides Auth"| DialogSvc
    TokenSvc -->|"Provides Auth"| ModelsSvc
    TokenSvc -->|"State Updates"| DebugCtx
    
    DialogSvc -->|"GraphQL Queries"| Gateway
    ModelsSvc -->|"REST Requests"| Gateway
    MockSvc -.->|"Development Mode"| UI
    
    Gateway -->|"Routes"| ChatAPI
    Gateway -->|"Routes"| ExternalAPI
    Gateway -->|"Routes"| AuthzAPI
    
    AuthzAPI -->|"JWT Tokens"| TokenMgr
    ChatAPI -->|"Messages & Dialogs"| DialogSvc
    ExternalAPI -->|"Model Metadata"| ModelsSvc
    
    Contexts -->|"Global State"| UI
    Services -->|"Data & Logic"| UI
    
    style Desktop fill:#2d3748,stroke:#4a5568,color:#fff
    style Rust fill:#c05621,stroke:#9c4221,color:#fff
    style React fill:#4299e1,stroke:#2b6cb0,color:#fff
    style Backend fill:#48bb78,stroke:#2f855a,color:#fff
    style APIs fill:#38a169,stroke:#276749,color:#fff
```

---

## 2. Service Layer Architecture

```mermaid
flowchart TD
    subgraph TauriBackend["Tauri Backend (Rust)"]
        AuthStore["Authentication Store"]
        ConfigStore["Configuration Store"]
        EventSystem["Event System"]
    end
    
    subgraph ServiceLayer["Service Layer (TypeScript)"]
        subgraph TokenMgmt["Token Management"]
            TokenSvc["TokenService"]
            TokenCache["Token Cache"]
            TokenListeners["Token Listeners"]
        end
        
        subgraph GraphQLComm["GraphQL Communication"]
            DialogSvc["DialogGraphQLService"]
            GraphQLClient["GraphQL Client"]
            QueryCache["Query Cache"]
        end
        
        subgraph ModelMgmt["Model Management"]
            ModelsSvc["SupportedModelsService"]
            ModelsCache["Models Cache"]
            ModelsAPI["Models API Client"]
        end
        
        subgraph MockLayer["Mock Layer"]
            MockSvc["MockChatService"]
            MockData["Mock Data Generator"]
        end
    end
    
    subgraph BackendAPIs["Backend APIs"]
        ChatGraphQL["Chat GraphQL API"]
        ConfigREST["Configuration REST API"]
    end
    
    AuthStore -->|"Events"| EventSystem
    ConfigStore -->|"Commands"| EventSystem
    EventSystem -->|"token-update"| TokenSvc
    EventSystem -->|"get_server_url()"| TokenSvc
    
    TokenSvc --> TokenCache
    TokenSvc --> TokenListeners
    TokenListeners -->|"Notify"| DialogSvc
    TokenListeners -->|"Notify"| ModelsSvc
    
    DialogSvc --> GraphQLClient
    GraphQLClient --> QueryCache
    GraphQLClient -->|"Queries"| ChatGraphQL
    
    ModelsSvc --> ModelsCache
    ModelsSvc --> ModelsAPI
    ModelsAPI -->|"REST"| ConfigREST
    
    MockSvc --> MockData
    MockSvc -.->|"Development"| DialogSvc
    
    style TauriBackend fill:#c05621,stroke:#9c4221,color:#fff
    style ServiceLayer fill:#4299e1,stroke:#2b6cb0,color:#fff
    style BackendAPIs fill:#48bb78,stroke:#2f855a,color:#fff
```

---

## 3. Complete Data Flow - Message Sending

```mermaid
sequenceDiagram
    participant User
    participant UI as Chat UI
    participant TokenSvc as Token Service
    participant DialogSvc as Dialog Service
    participant Gateway as Gateway Service
    participant ChatAPI as Chat API
    participant MingoAI as Mingo AI
    
    User->>UI: Type message
    UI->>UI: Validate input
    UI->>TokenSvc: Ensure token ready
    
    alt Token Available
        TokenSvc-->>UI: Token valid
    else Token Missing
        TokenSvc->>TokenSvc: Request from Rust
        TokenSvc-->>UI: Token retrieved
    end
    
    UI->>DialogSvc: Send message
    DialogSvc->>Gateway: POST /chat/graphql
    Note over DialogSvc,Gateway: Authorization: Bearer {token}
    
    Gateway->>ChatAPI: Route to Chat API
    ChatAPI->>MingoAI: Process message
    
    MingoAI-->>ChatAPI: Stream response
    ChatAPI-->>Gateway: Stream segments
    Gateway-->>DialogSvc: Stream segments
    
    loop For each segment
        DialogSvc-->>UI: Segment (text/tool)
        UI->>UI: Render segment
        UI-->>User: Display update
    end
    
    ChatAPI-->>Gateway: Complete
    Gateway-->>DialogSvc: Complete
    DialogSvc-->>UI: Message complete
    UI-->>User: Show complete message
```

---

## 4. Token Lifecycle Management

```mermaid
stateDiagram-v2
    [*] --> Initializing: App Start
    
    Initializing --> CheckingEnv: Check Environment
    CheckingEnv --> UsingEnvToken: VITE_TOKEN exists
    CheckingEnv --> RequestingToken: No env token
    
    UsingEnvToken --> TokenReady: Token set
    RequestingToken --> WaitingRust: invoke('get_token')
    WaitingRust --> TokenReady: Token received
    WaitingRust --> TokenMissing: No token
    
    TokenReady --> Active: Services initialized
    TokenMissing --> Error: Show auth error
    
    Active --> Listening: Setup event listener
    Listening --> Active: Normal operation
    Listening --> Updating: token-update event
    
    Updating --> Validating: Validate new token
    Validating --> Active: Token valid
    Validating --> Error: Token invalid
    
    Active --> Refreshing: Token expiring
    Refreshing --> RequestingToken: Request new token
    
    Error --> [*]: User must re-authenticate
```

---

## 5. Dialog History Loading Flow

```mermaid
flowchart TD
    Start["Application Start"] --> InitToken["Initialize Token Service"]
    InitToken --> CheckToken{"Token<br/>Available?"}
    
    CheckToken -->|"No"| RequestToken["Request Token from Rust"]
    RequestToken --> WaitToken["Wait for Token"]
    WaitToken --> CheckToken
    
    CheckToken -->|"Yes"| InitDialog["Initialize Dialog Service"]
    InitDialog --> QueryResumable["Query resumableDialog"]
    
    QueryResumable --> CheckDialog{"Dialog<br/>Exists?"}
    
    CheckDialog -->|"No"| ShowEmpty["Show Empty Chat State"]
    ShowEmpty --> Ready["Application Ready"]
    
    CheckDialog -->|"Yes"| FetchMessages["Fetch Messages (Page 1)"]
    FetchMessages --> ProcessPage["Process Message Page"]
    ProcessPage --> CheckMore{"More<br/>Pages?"}
    
    CheckMore -->|"Yes"| FetchNext["Fetch Next Page"]
    FetchNext --> ProcessPage
    
    CheckMore -->|"No"| SortMessages["Sort Messages by Time"]
    SortMessages --> RenderHistory["Render Message History"]
    RenderHistory --> Ready
    
    Ready --> ListenUpdates["Listen for New Messages"]
    
    style Start fill:#4299e1,stroke:#2b6cb0,color:#fff
    style Ready fill:#48bb78,stroke:#2f855a,color:#fff
    style ShowEmpty fill:#ed8936,stroke:#c05621,color:#fff
```

---

## 6. Tool Execution Workflow

```mermaid
flowchart TD
    UserMsg["User Sends Message"] --> AIAnalyze["AI Analyzes Message"]
    AIAnalyze --> NeedTool{"Tool<br/>Needed?"}
    
    NeedTool -->|"No"| TextResponse["Generate Text Response"]
    TextResponse --> StreamText["Stream Text to UI"]
    StreamText --> Complete["Message Complete"]
    
    NeedTool -->|"Yes"| StreamExecuting["Stream EXECUTING_TOOL"]
    StreamExecuting --> ShowIndicator["UI Shows Tool Indicator"]
    
    ShowIndicator --> CheckApproval{"Requires<br/>Approval?"}
    
    CheckApproval -->|"Yes"| RequestApproval["Request User Approval"]
    RequestApproval --> WaitApproval["Wait for Approval"]
    WaitApproval --> CheckResponse{"Approved?"}
    
    CheckResponse -->|"No"| StreamDenied["Stream Approval Denied"]
    StreamDenied --> TextResponse
    
    CheckResponse -->|"Yes"| ExecuteTool["Execute Tool Function"]
    CheckApproval -->|"No"| ExecuteTool
    
    ExecuteTool --> ToolResult{"Tool<br/>Success?"}
    
    ToolResult -->|"Yes"| StreamExecuted["Stream EXECUTED_TOOL (Success)"]
    ToolResult -->|"No"| StreamError["Stream EXECUTED_TOOL (Error)"]
    
    StreamExecuted --> ShowResult["UI Shows Tool Result"]
    StreamError --> ShowError["UI Shows Error"]
    
    ShowResult --> ProcessResult["AI Processes Result"]
    ShowError --> ProcessResult
    
    ProcessResult --> TextResponse
    
    style UserMsg fill:#4299e1,stroke:#2b6cb0,color:#fff
    style Complete fill:#48bb78,stroke:#2f855a,color:#fff
    style StreamError fill:#f56565,stroke:#c53030,color:#fff
```

---

## 7. Context Provider Architecture

```mermaid
flowchart TD
    subgraph AppRoot["Application Root"]
        subgraph Providers["Context Providers"]
            DebugProvider["DebugModeProvider"]
        end
        
        subgraph AppComponents["Application Components"]
            ChatPage["Chat Page"]
            Settings["Settings"]
            DevTools["Developer Tools"]
        end
    end
    
    subgraph TauriBackend["Tauri Backend"]
        DebugConfig["Debug Configuration"]
        DebugCommand["get_debug_mode Command"]
    end
    
    subgraph ContextState["Context State"]
        DebugState["debugMode: boolean"]
        SetDebug["setDebugMode: function"]
    end
    
    DebugProvider -->|"Provides"| ContextState
    ContextState -->|"Consumed by"| ChatPage
    ContextState -->|"Consumed by"| Settings
    ContextState -->|"Consumed by"| DevTools
    
    DebugProvider -->|"invoke()"| DebugCommand
    DebugCommand -->|"Returns state"| DebugConfig
    DebugConfig -->|"Initial value"| DebugState
    
    Settings -->|"Toggle"| SetDebug
    SetDebug -->|"Updates"| DebugState
    DebugState -->|"Triggers re-render"| ChatPage
    DebugState -->|"Triggers re-render"| DevTools
    
    style Providers fill:#9f7aea,stroke:#6b46c1,color:#fff
    style ContextState fill:#4299e1,stroke:#2b6cb0,color:#fff
    style TauriBackend fill:#c05621,stroke:#9c4221,color:#fff
```

---

## 8. Mock Service Architecture

```mermaid
flowchart TD
    subgraph MockService["Mock Chat Service"]
        StreamResponse["streamResponse()"]
        StreamWithTool["streamResponseWithTool()"]
        StreamWithError["streamResponseWithError()"]
        
        subgraph ResponseGen["Response Generation"]
            TextGen["Text Generator"]
            ToolGen["Tool Execution Generator"]
            ErrorGen["Error Generator"]
        end
        
        subgraph MockData["Mock Data"]
            Responses["Predefined Responses"]
            ToolResults["Mock Tool Results"]
            ErrorScenarios["Error Scenarios"]
        end
    end
    
    subgraph DevMode["Development Mode"]
        TestUI["Test UI Components"]
        DebugTools["Debug Tools"]
        Integration["Integration Tests"]
    end
    
    StreamResponse --> TextGen
    StreamWithTool --> ToolGen
    StreamWithError --> ErrorGen
    
    TextGen --> Responses
    ToolGen --> ToolResults
    ErrorGen --> ErrorScenarios
    
    StreamResponse -.->|"Provides data"| TestUI
    StreamWithTool -.->|"Provides data"| TestUI
    StreamWithError -.->|"Provides data"| DebugTools
    
    MockService -.->|"Used by"| Integration
    
    style MockService fill:#ed8936,stroke:#c05621,color:#fff
    style DevMode fill:#4299e1,stroke:#2b6cb0,color:#fff
    style MockData fill:#ecc94b,stroke:#d69e2e,color:#000
```

---

## 9. Error Handling Flow

```mermaid
flowchart TD
    Operation["Service Operation"] --> TryCatch["Try-Catch Block"]
    
    TryCatch -->|"Success"| ProcessData["Process Data"]
    ProcessData --> ReturnSuccess["Return Success"]
    
    TryCatch -->|"Error"| IdentifyError["Identify Error Type"]
    
    IdentifyError --> CheckType{"Error<br/>Type?"}
    
    CheckType -->|"Token Error"| TokenError["Token Missing/Invalid"]
    CheckType -->|"Network Error"| NetworkError["Connection Failed"]
    CheckType -->|"GraphQL Error"| GraphQLError["Query Failed"]
    CheckType -->|"Unknown Error"| UnknownError["Unexpected Error"]
    
    TokenError --> LogError["Log Error (Masked)"]
    NetworkError --> LogError
    GraphQLError --> LogError
    UnknownError --> LogError
    
    LogError --> CheckDebug{"Debug<br/>Mode?"}
    
    CheckDebug -->|"Yes"| DetailedLog["Log Detailed Info"]
    CheckDebug -->|"No"| BasicLog["Log Basic Info"]
    
    DetailedLog --> NotifyUI["Notify UI Layer"]
    BasicLog --> NotifyUI
    
    NotifyUI --> ShowError["Show User-Friendly Error"]
    ShowError --> OfferRetry{"Retryable?"}
    
    OfferRetry -->|"Yes"| ShowRetry["Show Retry Button"]
    OfferRetry -->|"No"| ShowSupport["Show Support Link"]
    
    ShowRetry --> UserAction["Wait for User Action"]
    ShowSupport --> UserAction
    
    UserAction -->|"Retry"| Operation
    UserAction -->|"Cancel"| End["End Operation"]
    
    ReturnSuccess --> End
    
    style Operation fill:#4299e1,stroke:#2b6cb0,color:#fff
    style ReturnSuccess fill:#48bb78,stroke:#2f855a,color:#fff
    style ShowError fill:#f56565,stroke:#c53030,color:#fff
    style End fill:#a0aec0,stroke:#718096,color:#fff
```

---

## 10. Component Interaction Map

```mermaid
flowchart LR
    subgraph UI["UI Layer"]
        ChatContainer["Chat Container"]
        MessageList["Message List"]
        InputArea["Input Area"]
        ToolDisplay["Tool Display"]
    end
    
    subgraph Contexts["Context Layer"]
        DebugContext["Debug Context"]
    end
    
    subgraph Services["Service Layer"]
        TokenService["Token Service"]
        DialogService["Dialog Service"]
        ModelsService["Models Service"]
        MockService["Mock Service"]
    end
    
    subgraph Tauri["Tauri Layer"]
        RustBackend["Rust Backend"]
    end
    
    subgraph Backend["Backend Layer"]
        APIs["Backend APIs"]
    end
    
    ChatContainer -->|"Uses"| MessageList
    ChatContainer -->|"Uses"| InputArea
    MessageList -->|"Uses"| ToolDisplay
    
    ChatContainer -->|"Consumes"| DebugContext
    InputArea -->|"Consumes"| DebugContext
    
    ChatContainer -->|"Calls"| DialogService
    InputArea -->|"Calls"| DialogService
    MessageList -->|"Calls"| ModelsService
    
    DialogService -->|"Uses"| TokenService
    ModelsService -->|"Uses"| TokenService
    
    TokenService -->|"Invokes"| RustBackend
    DebugContext -->|"Invokes"| RustBackend
    
    DialogService -->|"Queries"| APIs
    ModelsService -->|"Requests"| APIs
    
    MockService -.->|"Dev Mode"| DialogService
    
    style UI fill:#4299e1,stroke:#2b6cb0,color:#fff
    style Contexts fill:#9f7aea,stroke:#6b46c1,color:#fff
    style Services fill:#48bb78,stroke:#2f855a,color:#fff
    style Tauri fill:#c05621,stroke:#9c4221,color:#fff
    style Backend fill:#38a169,stroke:#276749,color:#fff
```

---

## 11. Deployment Architecture

```mermaid
flowchart TD
    subgraph Development["Development Environment"]
        DevMachine["Developer Machine"]
        DevServer["Dev Server (Vite)"]
        MockBackend["Mock Backend"]
    end
    
    subgraph Build["Build Process"]
        BuildCmd["npm run tauri build"]
        TauriBuilder["Tauri Builder"]
        
        subgraph Artifacts["Build Artifacts"]
            WindowsExe["Windows .exe"]
            MacOSApp["macOS .app"]
            LinuxBin["Linux Binary"]
        end
    end
    
    subgraph Production["Production Environment"]
        UserMachine["User Machine"]
        DesktopApp["Desktop Application"]
        
        subgraph ProdBackend["Production Backend"]
            Gateway["Gateway Service"]
            AuthService["Authorization Service"]
            ChatService["Chat API Service"]
        end
    end
    
    DevMachine -->|"npm run tauri dev"| DevServer
    DevServer -->|"Hot Reload"| DevMachine
    DevServer -.->|"Optional"| MockBackend
    
    DevMachine -->|"Build"| BuildCmd
    BuildCmd --> TauriBuilder
    TauriBuilder --> WindowsExe
    TauriBuilder --> MacOSApp
    TauriBuilder --> LinuxBin
    
    WindowsExe -->|"Install"| UserMachine
    MacOSApp -->|"Install"| UserMachine
    LinuxBin -->|"Install"| UserMachine
    
    UserMachine -->|"Run"| DesktopApp
    DesktopApp -->|"HTTPS"| Gateway
    Gateway --> AuthService
    Gateway --> ChatService
    
    style Development fill:#4299e1,stroke:#2b6cb0,color:#fff
    style Build fill:#ed8936,stroke:#c05621,color:#fff
    style Production fill:#48bb78,stroke:#2f855a,color:#fff
```

---

## 12. Security Architecture

```mermaid
flowchart TD
    subgraph SecureStorage["Secure Storage (Rust)"]
        TokenStore["Token Store<br/>(Memory)"]
        ConfigStore["Config Store<br/>(Encrypted)"]
    end
    
    subgraph JSLayer["JavaScript Layer"]
        TokenService["Token Service<br/>(No Storage)"]
        APIClients["API Clients<br/>(Use Token Service)"]
    end
    
    subgraph Communication["Secure Communication"]
        HTTPS["HTTPS Only"]
        BearerAuth["Bearer Token Auth"]
        CORS["CORS Validation"]
    end
    
    subgraph Backend["Backend Security"]
        JWTValidation["JWT Validation"]
        RateLimiting["Rate Limiting"]
        InputValidation["Input Validation"]
    end
    
    TokenStore -->|"Events Only"| TokenService
    ConfigStore -->|"Commands Only"| TokenService
    
    TokenService -->|"Provides Token"| APIClients
    APIClients -->|"Authorization Header"| HTTPS
    
    HTTPS --> BearerAuth
    BearerAuth --> CORS
    CORS --> JWTValidation
    
    JWTValidation --> RateLimiting
    RateLimiting --> InputValidation
    
    InputValidation -->|"Valid"| ProcessRequest["Process Request"]
    InputValidation -->|"Invalid"| RejectRequest["Reject Request"]
    
    style SecureStorage fill:#c05621,stroke:#9c4221,color:#fff
    style JSLayer fill:#4299e1,stroke:#2b6cb0,color:#fff
    style Communication fill:#48bb78,stroke:#2f855a,color:#fff
    style Backend fill:#38a169,stroke:#276749,color:#fff
```

---

## Documentation Navigation

For detailed information on each component, see:

- **[Complete Documentation](./frontend_chat.md)** - Full module documentation
- **[Context Management](./frontend_chat_contexts.md)** - Context providers
- **[Service Layer](./frontend_chat_services.md)** - Service implementations
- **[Getting Started](./FRONTEND_CHAT_README.md)** - Setup and API reference
- **[Quick Reference](./FRONTEND_CHAT_SUMMARY.md)** - One-page summary

---

**Last Updated**: 2024  
**Version**: 1.0.0  
**Maintainers**: OpenFrame Team
