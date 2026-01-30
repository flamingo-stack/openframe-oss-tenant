# Mingo AI Assistant - Visual Overview

This document provides comprehensive visual diagrams for understanding the Mingo AI Assistant module architecture, data flows, and component interactions.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Hierarchy](#component-hierarchy)
3. [State Management](#state-management)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Sequence Diagrams](#sequence-diagrams)
6. [State Transitions](#state-transitions)
7. [Error Handling Flow](#error-handling-flow)
8. [Performance Optimization](#performance-optimization)

---

## System Architecture

### High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser"]
        subgraph UI["UI Layer"]
            ChatUI["Chat Interface"]
            DialogList["Dialog List"]
            MessageInput["Message Input"]
            Notifications["Toast Notifications"]
        end
        
        subgraph Hooks["React Hooks"]
            UseMingoDialog["useMingoDialog"]
            UseMessages["useMessages"]
            UseDialogs["useDialogs"]
        end
        
        subgraph State["State Management"]
            ActiveStore["MingoDialogDetailsStore<br/>(Zustand)"]
            BgStore["BackgroundMessagesStore<br/>(Zustand + Immer)"]
        end
        
        subgraph API["API Layer"]
            RestClient["REST API Client"]
            GraphQLClient["GraphQL Client"]
            QueryCache["React Query Cache"]
        end
    end
    
    subgraph Backend["Backend Services"]
        Gateway["API Gateway"]
        ChatService["Chat API Service"]
        DialogService["Dialog Service"]
        MessageService["Message Service"]
        AIEngine["Mingo AI Engine"]
    end
    
    subgraph Data["Data Layer"]
        MongoDB["MongoDB"]
        Kafka["Kafka Streams"]
        Cache["Redis Cache"]
    end
    
    ChatUI --> UseMingoDialog
    DialogList --> UseDialogs
    MessageInput --> UseMingoDialog
    
    UseMingoDialog --> ActiveStore
    UseMingoDialog --> BgStore
    UseMingoDialog --> RestClient
    
    UseMessages --> GraphQLClient
    UseDialogs --> GraphQLClient
    
    RestClient --> QueryCache
    GraphQLClient --> QueryCache
    
    RestClient --> Gateway
    GraphQLClient --> Gateway
    
    Gateway --> ChatService
    Gateway --> DialogService
    Gateway --> MessageService
    
    ChatService --> AIEngine
    MessageService --> AIEngine
    
    DialogService --> MongoDB
    MessageService --> MongoDB
    MessageService --> Kafka
    
    AIEngine --> Cache
    
    ActiveStore -.->|"State Sync"| BgStore
    
    style ActiveStore fill:#4CAF50
    style BgStore fill:#2196F3
    style UseMingoDialog fill:#FF9800
    style AIEngine fill:#9C27B0
    style Gateway fill:#607D8B
```

### Module Boundaries

```mermaid
flowchart LR
    subgraph MingoModule["Mingo AI Assistant Module"]
        direction TB
        Hook["useMingoDialog Hook"]
        ActiveStore["MingoDialogDetailsStore"]
        BgStore["BackgroundMessagesStore"]
        Types["Type Definitions"]
    end
    
    subgraph FrontendCore["Frontend Core"]
        ChatComponents["Chat Components"]
        UIComponents["UI Components"]
        ApiClient["API Client"]
    end
    
    subgraph Backend["Backend Services"]
        ChatAPI["Chat API"]
        GraphQLAPI["GraphQL API"]
    end
    
    MingoModule --> FrontendCore
    MingoModule --> Backend
    
    style MingoModule fill:#E3F2FD
    style FrontendCore fill:#FFF3E0
    style Backend fill:#F3E5F5
```

---

## Component Hierarchy

### React Component Tree

```mermaid
flowchart TD
    App["App Root"] --> MingoPage["Mingo Page"]
    
    MingoPage --> ChatContainer["Chat Container"]
    MingoPage --> Sidebar["Sidebar"]
    
    ChatContainer --> ChatHeader["Chat Header"]
    ChatContainer --> MessageList["Message List"]
    ChatContainer --> InputArea["Input Area"]
    
    MessageList --> MessageBubble["Message Bubble"]
    MessageList --> TypingIndicator["Typing Indicator"]
    MessageList --> LoadMore["Load More Button"]
    
    MessageBubble --> UserMessage["User Message"]
    MessageBubble --> AssistantMessage["Assistant Message"]
    
    InputArea --> MessageInput["Message Input"]
    InputArea --> SendButton["Send Button"]
    InputArea --> AttachButton["Attach Button (Future)"]
    
    Sidebar --> DialogList["Dialog List"]
    Sidebar --> NewChatButton["New Chat Button"]
    
    DialogList --> DialogItem["Dialog Item"]
    DialogItem --> UnreadBadge["Unread Badge"]
    DialogItem --> DialogPreview["Dialog Preview"]
    
    style ChatContainer fill:#E8F5E9
    style MessageList fill:#E3F2FD
    style Sidebar fill:#FFF3E0
```

### Hook Dependencies

```mermaid
flowchart TD
    UseMingoDialog["useMingoDialog"] --> UseMutation["useMutation<br/>(React Query)"]
    UseMingoDialog --> UseToast["useToast"]
    UseMingoDialog --> UseQueryClient["useQueryClient"]
    
    UseMessages["useMessages"] --> UseInfiniteQuery["useInfiniteQuery<br/>(React Query)"]
    UseMessages --> UseMingoDialogDetailsStore["useMingoDialogDetailsStore"]
    
    UseDialogs["useDialogs"] --> UseInfiniteQuery2["useInfiniteQuery<br/>(React Query)"]
    UseDialogs --> UseMingoBackgroundMessagesStore["useMingoBackgroundMessagesStore"]
    
    UseMutation --> ApiClient["API Client"]
    UseInfiniteQuery --> GraphQLClient["GraphQL Client"]
    UseInfiniteQuery2 --> GraphQLClient
    
    style UseMingoDialog fill:#FF9800
    style UseMessages fill:#4CAF50
    style UseDialogs fill:#2196F3
```

---

## State Management

### Store Architecture

```mermaid
flowchart TD
    subgraph ActiveStore["MingoDialogDetailsStore (Active Dialog)"]
        direction TB
        AS_State["State"]
        AS_Actions["Actions"]
        
        AS_State --> CurrentDialog["currentDialogId<br/>currentDialog<br/>adminMessages[]"]
        AS_State --> Loading["isLoadingDialog<br/>isLoadingMessages"]
        AS_State --> Errors["dialogError<br/>messagesError"]
        AS_State --> Pagination["hasMoreMessages<br/>messagesCursor<br/>newestMessageCursor"]
        AS_State --> Typing["dialogTypingStates{}"]
        
        AS_Actions --> DialogActions["setCurrentDialogId()<br/>setCurrentDialog()<br/>clearCurrent()"]
        AS_Actions --> MessageActions["setAdminMessages()<br/>addAdminMessages()<br/>addRealtimeMessage()"]
        AS_Actions --> TypingActions["ensureTypingMessage()<br/>removeTypingMessage()<br/>updateLastAssistantMessage()"]
    end
    
    subgraph BgStore["BackgroundMessagesStore (Background Dialogs)"]
        direction TB
        BG_State["State"]
        BG_Actions["Actions"]
        
        BG_State --> DialogMessages["dialogMessages{}<br/>(50 msg limit per dialog)"]
        BG_State --> Unread["unreadCounts{}"]
        BG_State --> BgTyping["backgroundTypingIndicators{}"]
        BG_State --> ActiveId["activeDialogId"]
        
        BG_Actions --> BgMessageActions["addBackgroundMessage()<br/>setDialogMessages()<br/>mergeDialogMessages()"]
        BG_Actions --> UnreadActions["incrementUnreadCount()<br/>resetUnreadCount()<br/>getUnreadCount()"]
        BG_Actions --> TransferActions["moveBackgroundToActive()<br/>preserveStreamingMessage()"]
    end
    
    ActiveStore -.->|"Dialog Switch"| BgStore
    BgStore -.->|"Activate Dialog"| ActiveStore
    
    style ActiveStore fill:#4CAF50
    style BgStore fill:#2196F3
```

### State Synchronization

```mermaid
flowchart LR
    subgraph Events["Event Sources"]
        UserSend["User Sends Message"]
        IncomingMsg["Incoming Message"]
        DialogSwitch["Dialog Switch"]
        StreamChunk["Stream Chunk"]
    end
    
    subgraph Router["Event Router"]
        CheckActive{"Is Active<br/>Dialog?"}
        CheckType{"Message<br/>Type?"}
    end
    
    subgraph Stores["State Stores"]
        Active["Active Store"]
        Background["Background Store"]
    end
    
    UserSend --> Active
    
    IncomingMsg --> CheckActive
    CheckActive -->|"Yes"| Active
    CheckActive -->|"No"| CheckType
    
    CheckType -->|"User/Complete"| Background
    CheckType -->|"Streaming"| StreamHandler["Stream Handler"]
    StreamHandler --> Background
    
    StreamChunk --> Active
    
    DialogSwitch --> Transfer["Transfer State"]
    Transfer --> Active
    Transfer --> Background
    
    Background -.->|"Increment Unread"| UnreadCounter["Unread Counter"]
    Active -.->|"Reset Unread"| UnreadCounter
    
    style Active fill:#4CAF50
    style Background fill:#2196F3
    style Router fill:#FF9800
```

---

## Data Flow Diagrams

### Message Sending Flow

```mermaid
flowchart TD
    Start["User Types Message"] --> Validate["Validate Content"]
    
    Validate -->|"Empty"| ErrorToast["Show Error Toast"]
    ErrorToast --> End1["End"]
    
    Validate -->|"Valid"| CheckDialog{"Dialog<br/>Exists?"}
    
    CheckDialog -->|"No"| CreateDialog["Create Dialog"]
    CreateDialog --> CreateAPI["POST /chat/api/v2/dialogs"]
    CreateAPI --> SaveDialogId["Save Dialog ID"]
    SaveDialogId --> AddTyping["Add Typing Message"]
    
    CheckDialog -->|"Yes"| AddTyping
    
    AddTyping --> UpdateStore1["ensureTypingMessage()"]
    UpdateStore1 --> SendAPI["POST /chat/api/v2/messages"]
    
    SendAPI -->|"Success"| StreamStart["Backend Starts Streaming"]
    SendAPI -->|"Error"| HandleError["Handle Error"]
    
    HandleError --> ErrorToast2["Show Error Toast"]
    ErrorToast2 --> RemoveTyping1["removeTypingMessage()"]
    RemoveTyping1 --> End2["End"]
    
    StreamStart --> ReceiveChunk["Receive Chunk"]
    ReceiveChunk --> UpdateMessage["updateLastAssistantMessage()"]
    UpdateMessage --> MoreChunks{"More<br/>Chunks?"}
    
    MoreChunks -->|"Yes"| ReceiveChunk
    MoreChunks -->|"No"| StreamComplete["Stream Complete"]
    
    StreamComplete --> RemoveTyping2["removeTypingMessage()"]
    RemoveTyping2 --> Invalidate["Invalidate Query Cache"]
    Invalidate --> End3["End"]
    
    style CreateDialog fill:#FF9800
    style SendAPI fill:#2196F3
    style UpdateMessage fill:#4CAF50
    style HandleError fill:#F44336
```

### Dialog Switching Flow

```mermaid
flowchart TD
    Start["User Clicks Dialog"] --> GetBgMessages["Get Background Messages"]
    GetBgMessages --> BgStore["backgroundMessagesStore.moveBackgroundToActive()"]
    
    BgStore --> ResetUnread["Reset Unread Count"]
    ResetUnread --> ClearActive["Clear Active Store"]
    
    ClearActive --> SetNewDialog["Set New Dialog ID"]
    SetNewDialog --> LoadBgMessages["Load Background Messages"]
    
    LoadBgMessages --> CheckComplete{"Has Full<br/>History?"}
    
    CheckComplete -->|"No"| QueryAPI["Query GraphQL API"]
    QueryAPI --> FetchMessages["Fetch Full Message History"]
    FetchMessages --> MergeMessages["Merge with Background Messages"]
    MergeMessages --> UpdateUI["Update UI"]
    
    CheckComplete -->|"Yes"| UpdateUI
    
    UpdateUI --> StorePrevious["Store Previous Dialog in Background"]
    StorePrevious --> Complete["Complete"]
    
    style BgStore fill:#2196F3
    style QueryAPI fill:#9C27B0
    style UpdateUI fill:#4CAF50
```

### Background Message Handling

```mermaid
flowchart TD
    IncomingMsg["Incoming Message"] --> CheckActive{"Is Active<br/>Dialog?"}
    
    CheckActive -->|"Yes"| ActivePath["Active Dialog Path"]
    ActivePath --> AddRealtime["addRealtimeMessage()"]
    AddRealtime --> UpdateUI["Update UI Immediately"]
    UpdateUI --> End1["End"]
    
    CheckActive -->|"No"| BgPath["Background Dialog Path"]
    BgPath --> AddBg["addBackgroundMessage()"]
    
    AddBg --> CheckOwner{"Message<br/>Owner?"}
    
    CheckOwner -->|"Assistant"| CheckText{"Has<br/>Text?"}
    CheckOwner -->|"User"| IncrementUnread["incrementUnreadCount()"]
    
    CheckText -->|"Yes (Complete)"| IncrementUnread
    CheckText -->|"No (Streaming)"| SetTyping["setBackgroundTyping(true)"]
    
    IncrementUnread --> UpdateBadge["Update Unread Badge"]
    SetTyping --> UpdateBadge
    
    UpdateBadge --> CheckLimit{"Message<br/>Count > 50?"}
    
    CheckLimit -->|"Yes"| TrimMessages["Trim to Last 50"]
    CheckLimit -->|"No"| End2["End"]
    
    TrimMessages --> End2
    
    style ActivePath fill:#4CAF50
    style BgPath fill:#2196F3
    style IncrementUnread fill:#FF9800
```

---

## Sequence Diagrams

### Complete Message Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant UI as Chat UI
    participant Hook as useMingoDialog
    participant Active as ActiveStore
    participant API as API Client
    participant Backend as Chat Service
    participant AI as Mingo AI
    
    User->>UI: Type "Help with server issue"
    UI->>Hook: sendMessage(content)
    
    Hook->>Hook: Validate content
    
    alt No Dialog Exists
        Hook->>API: POST /chat/api/v2/dialogs
        API->>Backend: Create dialog
        Backend-->>API: Dialog ID: abc123
        API-->>Hook: Return dialog ID
        Hook->>Active: setCurrentDialogId("abc123")
    end
    
    Hook->>Active: ensureTypingMessage("abc123")
    Active-->>UI: Show typing indicator
    
    Hook->>API: POST /chat/api/v2/messages
    API->>Backend: Send message
    Backend->>AI: Process message
    
    AI->>AI: Generate response
    
    loop Streaming Response
        AI-->>Backend: Response chunk
        Backend-->>API: Forward chunk
        API-->>Hook: Chunk data
        Hook->>Active: updateLastAssistantMessage(chunk)
        Active-->>UI: Update message text
    end
    
    AI-->>Backend: Response complete
    Backend-->>API: Stream complete
    API-->>Hook: Complete signal
    
    Hook->>Active: removeTypingMessage("abc123")
    Active-->>UI: Hide typing indicator
    
    Hook->>API: Invalidate query cache
    UI-->>User: Show complete response
```

### Dialog Switching Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as Dialog List
    participant Active as ActiveStore
    participant Bg as BackgroundStore
    participant API as GraphQL API
    
    User->>UI: Click Dialog B
    UI->>Bg: moveBackgroundToActive("dialog-b")
    
    Bg->>Bg: Get background messages
    Bg->>Bg: Reset unread count
    Bg-->>UI: Return messages
    
    UI->>Active: clearCurrent()
    Active->>Active: Clear current state
    
    UI->>Active: setCurrentDialogId("dialog-b")
    UI->>Active: setAdminMessages(bgMessages)
    
    Active-->>UI: Update display
    
    UI->>API: Query full message history
    API-->>UI: Return paginated messages
    
    UI->>Active: addAdminMessages(messages)
    Active-->>UI: Update with full history
    
    Note over Bg: Dialog A now in background
    UI->>Bg: Store Dialog A messages
    Bg->>Bg: Limit to 50 messages
    
    UI-->>User: Show Dialog B
```

### Background Message Reception

```mermaid
sequenceDiagram
    participant Backend as Message Service
    participant Client as Client App
    participant Router as Event Router
    participant Active as ActiveStore
    participant Bg as BackgroundStore
    participant UI as Dialog List
    
    Backend->>Client: New message (Dialog C)
    Client->>Router: Route message
    
    Router->>Router: Check if active dialog
    
    alt Is Active Dialog
        Router->>Active: addRealtimeMessage(msg)
        Active->>UI: Update chat UI
    else Is Background Dialog
        Router->>Bg: addBackgroundMessage(msg)
        
        alt Message is complete
            Bg->>Bg: incrementUnreadCount()
            Bg->>UI: Update unread badge
        else Message is streaming
            Bg->>Bg: setBackgroundTyping(true)
            Bg->>UI: Show typing indicator
        end
        
        Bg->>Bg: Check message limit
        
        alt Count > 50
            Bg->>Bg: Trim to last 50 messages
        end
    end
```

---

## State Transitions

### Dialog State Machine

```mermaid
stateDiagram-v2
    [*] --> NoDialog: Initial State
    
    NoDialog --> Creating: User sends message
    Creating --> Active: Dialog created
    Creating --> Error: Creation failed
    
    Active --> Sending: User sends message
    Sending --> Streaming: Message sent
    Streaming --> Active: Response complete
    Sending --> Error: Send failed
    
    Active --> Background: User switches dialog
    Background --> Loading: User selects dialog
    Loading --> Active: Messages loaded
    
    Active --> Resolved: Dialog resolved
    Resolved --> [*]: Dialog closed
    
    Error --> NoDialog: Reset
    Error --> Active: Retry successful
```

### Message State Machine

```mermaid
stateDiagram-v2
    [*] --> Composing: User types
    
    Composing --> Validating: User clicks send
    Validating --> Invalid: Empty/Invalid
    Invalid --> Composing: User continues typing
    
    Validating --> Sending: Valid message
    Sending --> Sent: API success
    Sending --> Failed: API error
    
    Sent --> Streaming: AI starts response
    Streaming --> Accumulating: Receiving chunks
    Accumulating --> Accumulating: More chunks
    Accumulating --> Complete: Stream ends
    
    Failed --> Composing: User retries
    Complete --> [*]: Message complete
```

### Typing Indicator State

```mermaid
stateDiagram-v2
    [*] --> Hidden: Initial
    
    Hidden --> Creating: ensureTypingMessage()
    Creating --> Visible: Message created
    
    Visible --> Updating: updateLastAssistantMessage()
    Updating --> Visible: Text accumulated
    
    Visible --> Removing: removeTypingMessage()
    Removing --> Hidden: Message removed
    
    Hidden --> [*]: Complete
```

---

## Error Handling Flow

### Error Handling Strategy

```mermaid
flowchart TD
    Operation["API Operation"] --> Try["Try Operation"]
    
    Try -->|"Success"| Success["Update State"]
    Success --> Invalidate["Invalidate Cache"]
    Invalidate --> Complete["Complete"]
    
    Try -->|"Error"| CatchError["Catch Error"]
    CatchError --> CheckType{"Error<br/>Type?"}
    
    CheckType -->|"Network"| NetworkError["Network Error"]
    CheckType -->|"Validation"| ValidationError["Validation Error"]
    CheckType -->|"API"| APIError["API Error"]
    CheckType -->|"Unknown"| UnknownError["Unknown Error"]
    
    NetworkError --> CheckRetry{"Retry<br/>Count < 3?"}
    CheckRetry -->|"Yes"| Backoff["Exponential Backoff"]
    Backoff --> Retry["Retry Operation"]
    Retry --> Try
    
    CheckRetry -->|"No"| ShowError["Show Error Toast"]
    ValidationError --> ShowError
    APIError --> ShowError
    UnknownError --> ShowError
    
    ShowError --> LogError["Log Error"]
    LogError --> UpdateErrorState["Update Error State"]
    UpdateErrorState --> End["End"]
    
    style NetworkError fill:#FF9800
    style ValidationError fill:#FFC107
    style APIError fill:#F44336
    style ShowError fill:#E91E63
```

### Error Recovery Flow

```mermaid
flowchart TD
    Error["Error Occurred"] --> Classify["Classify Error"]
    
    Classify --> Recoverable{"Is<br/>Recoverable?"}
    
    Recoverable -->|"Yes"| AutoRetry["Automatic Retry"]
    AutoRetry --> RetrySuccess{"Retry<br/>Successful?"}
    
    RetrySuccess -->|"Yes"| Recover["Recover State"]
    Recover --> Complete["Complete"]
    
    RetrySuccess -->|"No"| ManualRetry["Offer Manual Retry"]
    ManualRetry --> UserAction{"User<br/>Action?"}
    
    UserAction -->|"Retry"| AutoRetry
    UserAction -->|"Cancel"| Rollback["Rollback State"]
    
    Recoverable -->|"No"| ShowError["Show Error Message"]
    ShowError --> Rollback
    
    Rollback --> CleanState["Clean Error State"]
    CleanState --> End["End"]
    
    style AutoRetry fill:#4CAF50
    style Rollback fill:#F44336
    style ManualRetry fill:#FF9800
```

---

## Performance Optimization

### Memory Management Strategy

```mermaid
flowchart TD
    IncomingMsg["Incoming Message"] --> CheckStore{"Which<br/>Store?"}
    
    CheckStore -->|"Active"| ActiveStore["Active Store"]
    CheckStore -->|"Background"| BgStore["Background Store"]
    
    ActiveStore --> NoLimit["No Message Limit"]
    NoLimit --> Pagination["Use Pagination"]
    Pagination --> LazyLoad["Lazy Load History"]
    
    BgStore --> CheckCount{"Message<br/>Count?"}
    
    CheckCount -->|"< 50"| AddMessage["Add Message"]
    CheckCount -->|">= 50"| TrimOldest["Trim Oldest Messages"]
    
    TrimOldest --> AddMessage
    AddMessage --> Deduplicate["Deduplicate by ID"]
    Deduplicate --> Store["Store in Memory"]
    
    LazyLoad --> Store
    
    Store --> Monitor["Monitor Memory Usage"]
    Monitor --> CheckThreshold{"Memory<br/>Threshold?"}
    
    CheckThreshold -->|"OK"| End["End"]
    CheckThreshold -->|"High"| GarbageCollect["Trigger GC"]
    GarbageCollect --> End
    
    style BgStore fill:#2196F3
    style TrimOldest fill:#FF9800
    style ActiveStore fill:#4CAF50
```

### Rendering Optimization

```mermaid
flowchart TD
    StateChange["State Change"] --> CheckScope{"Change<br/>Scope?"}
    
    CheckScope -->|"Global"| AllComponents["Re-render All"]
    CheckScope -->|"Specific"| Selector["Use Selector"]
    
    Selector --> CheckChanged{"Value<br/>Changed?"}
    
    CheckChanged -->|"Yes"| TargetComponent["Re-render Target Component"]
    CheckChanged -->|"No"| Skip["Skip Re-render"]
    
    TargetComponent --> Memo["React.memo Check"]
    Memo --> PropsChanged{"Props<br/>Changed?"}
    
    PropsChanged -->|"Yes"| Render["Render Component"]
    PropsChanged -->|"No"| Skip
    
    Render --> VirtualDOM["Update Virtual DOM"]
    VirtualDOM --> Diff["Diff with Previous"]
    Diff --> Patch["Patch Real DOM"]
    
    AllComponents --> VirtualDOM
    
    Patch --> End["End"]
    Skip --> End
    
    style Selector fill:#4CAF50
    style Skip fill:#2196F3
    style Memo fill:#FF9800
```

### Query Caching Strategy

```mermaid
flowchart TD
    Query["GraphQL Query"] --> CheckCache{"In<br/>Cache?"}
    
    CheckCache -->|"Yes"| CheckStale{"Is<br/>Stale?"}
    CheckCache -->|"No"| FetchAPI["Fetch from API"]
    
    CheckStale -->|"No"| ReturnCache["Return Cached Data"]
    CheckStale -->|"Yes"| Background["Background Refetch"]
    
    Background --> ReturnCache
    Background --> FetchAPI
    
    FetchAPI --> Success{"Fetch<br/>Success?"}
    
    Success -->|"Yes"| UpdateCache["Update Cache"]
    Success -->|"No"| RetryLogic["Retry Logic"]
    
    RetryLogic --> FetchAPI
    
    UpdateCache --> Invalidate["Check Invalidation Rules"]
    Invalidate --> RelatedQueries{"Related<br/>Queries?"}
    
    RelatedQueries -->|"Yes"| InvalidateRelated["Invalidate Related"]
    RelatedQueries -->|"No"| ReturnData["Return Data"]
    
    InvalidateRelated --> ReturnData
    ReturnCache --> ReturnData
    
    ReturnData --> End["End"]
    
    style CheckCache fill:#4CAF50
    style UpdateCache fill:#2196F3
    style RetryLogic fill:#FF9800
```

---

## Integration Patterns

### API Integration Pattern

```mermaid
flowchart TD
    Component["React Component"] --> Hook["Custom Hook"]
    
    Hook --> ReactQuery["React Query"]
    ReactQuery --> CheckCache{"Cache<br/>Hit?"}
    
    CheckCache -->|"Yes"| ReturnCache["Return Cached"]
    CheckCache -->|"No"| APIClient["API Client"]
    
    APIClient --> CheckType{"Request<br/>Type?"}
    
    CheckType -->|"REST"| RestAPI["REST API"]
    CheckType -->|"GraphQL"| GraphQLAPI["GraphQL API"]
    
    RestAPI --> Gateway["API Gateway"]
    GraphQLAPI --> Gateway
    
    Gateway --> Auth["Authentication"]
    Auth --> Backend["Backend Service"]
    
    Backend --> Response["Response"]
    Response --> Transform["Transform Data"]
    Transform --> UpdateCache["Update Cache"]
    UpdateCache --> ReturnData["Return to Component"]
    
    ReturnCache --> ReturnData
    ReturnData --> UpdateUI["Update UI"]
    
    style ReactQuery fill:#4CAF50
    style APIClient fill:#2196F3
    style Gateway fill:#FF9800
```

---

## Conclusion

These visual diagrams provide a comprehensive overview of the Mingo AI Assistant module's architecture, data flows, and component interactions. Use them as reference when:

- Understanding the system architecture
- Debugging issues
- Planning new features
- Onboarding new developers
- Documenting changes

For detailed implementation information, refer to the [main documentation](./mingo_ai_assistant.md).
