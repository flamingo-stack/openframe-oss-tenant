# Frontend Core Components - Visual Overview

> **Quick visual guide to the Frontend Core Components module architecture and capabilities**

---

## Module Architecture

### High-Level Organization

```mermaid
flowchart TD
    subgraph FrontendCore["Frontend Core Components Module"]
        direction TB
        
        subgraph ChatSystem["💬 Chat System"]
            ChatTypes["Type Definitions"]
            ChatHooks["React Hooks"]
            ChatUI["UI Components"]
        end
        
        subgraph Navigation["🧭 Navigation"]
            Header["Header Component"]
            NavConfig["Configuration"]
            NavItems["Navigation Items"]
        end
        
        subgraph UIComponents["📊 UI Components"]
            Table["Table Component"]
            Forms["Form Elements"]
            Buttons["Buttons"]
        end
        
        subgraph Providers["🎨 Providers"]
            Theme["Theme Provider"]
            Context["Context Hooks"]
        end
    end
    
    style FrontendCore fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style ChatSystem fill:#50C878,stroke:#2E7D4E,color:#fff
    style Navigation fill:#9B59B6,stroke:#6C3483,color:#fff
    style UIComponents fill:#E67E22,stroke:#A04000,color:#fff
    style Providers fill:#E74C3C,stroke:#922B21,color:#fff
```

---

## Chat System Architecture

### Real-Time Message Flow

```mermaid
sequenceDiagram
    participant User
    participant ChatUI["Chat UI"]
    participant Hooks["React Hooks"]
    participant NATS["NATS Server"]
    participant API["API Service"]
    
    User->>ChatUI: Type message
    ChatUI->>API: Send message
    API->>NATS: Publish to dialog topic
    
    NATS->>Hooks: MESSAGE_START
    Hooks->>ChatUI: onStreamStart()
    ChatUI->>User: Show typing indicator
    
    loop Streaming Response
        NATS->>Hooks: TEXT chunk
        Hooks->>ChatUI: onSegmentsUpdate()
        ChatUI->>User: Display text
    end
    
    NATS->>Hooks: EXECUTING_TOOL
    Hooks->>ChatUI: Show tool execution
    ChatUI->>User: Display tool status
    
    NATS->>Hooks: APPROVAL_REQUEST
    Hooks->>ChatUI: Show approval UI
    ChatUI->>User: Request approval
    User->>ChatUI: Approve/Reject
    ChatUI->>API: Send approval
    
    NATS->>Hooks: MESSAGE_END
    Hooks->>ChatUI: onStreamEnd()
    ChatUI->>User: Complete message
```

### Message Type Hierarchy

```mermaid
flowchart TD
    Message["Message"]
    
    Message --> Role["role: 'user' | 'assistant' | 'error'"]
    Message --> Content["content: string | MessageSegment[]"]
    Message --> Metadata["metadata: timestamp, name, avatar"]
    
    Content --> TextSegment["TextSegment<br/>{type: 'text', text: string}"]
    Content --> ToolSegment["ToolExecutionSegment<br/>{type: 'tool_execution', data: {...}}"]
    Content --> ApprovalSegment["ApprovalRequestSegment<br/>{type: 'approval_request', data: {...}}"]
    
    ToolSegment --> ToolData["ToolExecutionData<br/>• integratedToolType<br/>• toolFunction<br/>• parameters<br/>• result"]
    
    ApprovalSegment --> ApprovalData["ApprovalRequestData<br/>• command<br/>• explanation<br/>• requestId<br/>• status"]
    
    style Message fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Content fill:#50C878,stroke:#2E7D4E,color:#fff
    style TextSegment fill:#9B59B6,stroke:#6C3483,color:#fff
    style ToolSegment fill:#E67E22,stroke:#A04000,color:#fff
    style ApprovalSegment fill:#E74C3C,stroke:#922B21,color:#fff
```

---

## Navigation System

### Header Component Structure

```mermaid
flowchart LR
    Header["Header Component"]
    
    Header --> Left["Left Section"]
    Header --> Center["Center Section"]
    Header --> Right["Right Section"]
    
    Left --> Logo["Logo"]
    Left --> LeftActions["Left Actions"]
    
    Center --> NavItems["Navigation Items"]
    NavItems --> SimpleLink["Simple Links"]
    NavItems --> Dropdown["Dropdown Menus"]
    NavItems --> CustomElement["Custom Elements"]
    
    Right --> RightActions["Right Actions"]
    Right --> MobileToggle["Mobile Menu Toggle"]
    
    Dropdown --> DropdownItems["Dropdown Items"]
    Dropdown --> DropdownContent["Custom Content"]
    
    style Header fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Left fill:#50C878,stroke:#2E7D4E,color:#fff
    style Center fill:#9B59B6,stroke:#6C3483,color:#fff
    style Right fill:#E67E22,stroke:#A04000,color:#fff
```

### Navigation State Management

```mermaid
stateDiagram-v2
    [*] --> Visible
    
    Visible --> Hidden: Scroll Down
    Hidden --> Visible: Scroll Up
    
    Visible --> DropdownOpen: Click Dropdown
    DropdownOpen --> Visible: Click Outside
    DropdownOpen --> Visible: Press Escape
    DropdownOpen --> Visible: Select Item
    
    Visible --> MobileMenuOpen: Click Mobile Toggle
    MobileMenuOpen --> Visible: Click Close
    MobileMenuOpen --> Visible: Select Item
    
    note right of Visible
        Auto-hide enabled:
        - Hide on scroll down
        - Show on scroll up
    end note
    
    note right of DropdownOpen
        Dropdown behavior:
        - Click outside closes
        - Escape key closes
        - Item selection closes
    end note
```

---

## Table Component Architecture

### Table Rendering Flow

```mermaid
flowchart TD
    TableProps["TableProps<T>"]
    
    TableProps --> DataProcessing["Data Processing"]
    TableProps --> Rendering["Rendering"]
    
    DataProcessing --> Sorting["Apply Sorting"]
    DataProcessing --> Filtering["Apply Filtering"]
    DataProcessing --> Selection["Handle Selection"]
    
    Sorting --> SortedData["Sorted Data"]
    Filtering --> FilteredData["Filtered Data"]
    Selection --> SelectedRows["Selected Rows"]
    
    Rendering --> Desktop["Desktop View<br/>(≥768px)"]
    Rendering --> Mobile["Mobile View<br/>(<768px)"]
    
    Desktop --> TableHeader["Table Header<br/>• Sort controls<br/>• Filter dropdowns<br/>• Select all"]
    Desktop --> TableRows["Table Rows<br/>• Cells<br/>• Actions<br/>• Selection"]
    
    Mobile --> CardView["Card View<br/>• Stacked layout<br/>• Key info<br/>• Touch actions"]
    
    TableRows --> Pagination["Pagination"]
    CardView --> Pagination
    
    Pagination --> CursorPagination["Cursor-Based<br/>• hasNextPage<br/>• onNext/onPrevious"]
    Pagination --> PagePagination["Page-Based<br/>• currentPage<br/>• totalPages"]
    
    style TableProps fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style DataProcessing fill:#50C878,stroke:#2E7D4E,color:#fff
    style Rendering fill:#9B59B6,stroke:#6C3483,color:#fff
    style Desktop fill:#E67E22,stroke:#A04000,color:#fff
    style Mobile fill:#E74C3C,stroke:#922B21,color:#fff
```

### Table Features Matrix

```mermaid
flowchart LR
    Table["Table Component"]
    
    Table --> DataFeatures["Data Features"]
    Table --> UIFeatures["UI Features"]
    Table --> InteractionFeatures["Interaction Features"]
    
    DataFeatures --> Sorting["✅ Sorting<br/>• Single column<br/>• Custom functions"]
    DataFeatures --> Filtering["✅ Filtering<br/>• Column filters<br/>• Multiple values"]
    DataFeatures --> Pagination["✅ Pagination<br/>• Cursor-based<br/>• Page-based"]
    
    UIFeatures --> Responsive["✅ Responsive<br/>• Desktop table<br/>• Mobile cards"]
    UIFeatures --> Loading["✅ Loading States<br/>• Skeleton rows<br/>• Configurable count"]
    UIFeatures --> Empty["✅ Empty States<br/>• Custom message<br/>• Action button"]
    
    InteractionFeatures --> Selection["✅ Selection<br/>• Single row<br/>• Multi-row"]
    InteractionFeatures --> BulkActions["✅ Bulk Actions<br/>• Custom actions<br/>• Variants"]
    InteractionFeatures --> RowActions["✅ Row Actions<br/>• Inline buttons<br/>• Custom renderer"]
    
    style Table fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style DataFeatures fill:#50C878,stroke:#2E7D4E,color:#fff
    style UIFeatures fill:#9B59B6,stroke:#6C3483,color:#fff
    style InteractionFeatures fill:#E67E22,stroke:#A04000,color:#fff
```

---

## Theme System

### Theme Provider Flow

```mermaid
flowchart TD
    App["Application Root"]
    
    App --> ThemeProvider["DynamicThemeProvider"]
    
    ThemeProvider --> ThemeHook["useDynamicTheming Hook"]
    
    ThemeHook --> ThemeState["Theme State"]
    ThemeHook --> ThemeActions["Theme Actions"]
    
    ThemeState --> CurrentTheme["current theme config"]
    ThemeState --> IsDark["isDark boolean"]
    
    ThemeActions --> UpdateTheme["updateTheme(theme)"]
    ThemeActions --> ToggleDark["toggleDark()"]
    
    UpdateTheme --> CSSVars["Inject CSS Variables"]
    ToggleDark --> CSSVars
    
    CSSVars --> DOMUpdate["Update DOM"]
    
    DOMUpdate --> Components["All Components<br/>Use ODS Tokens"]
    
    Components --> ColorTokens["Color Tokens<br/>--ods-bg-primary<br/>--ods-text-primary<br/>--ods-accent"]
    
    style ThemeProvider fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style ThemeState fill:#50C878,stroke:#2E7D4E,color:#fff
    style ThemeActions fill:#9B59B6,stroke:#6C3483,color:#fff
    style CSSVars fill:#E67E22,stroke:#A04000,color:#fff
    style Components fill:#E74C3C,stroke:#922B21,color:#fff
```

### Theme Token System

```mermaid
flowchart LR
    ODSTokens["ODS Design Tokens"]
    
    ODSTokens --> Background["Background Tokens"]
    ODSTokens --> Text["Text Tokens"]
    ODSTokens --> Border["Border Tokens"]
    ODSTokens --> Accent["Accent Tokens"]
    
    Background --> BgPrimary["--ods-bg-primary"]
    Background --> BgSecondary["--ods-bg-secondary"]
    Background --> BgHover["--ods-bg-hover"]
    Background --> BgCard["--ods-card"]
    
    Text --> TextPrimary["--ods-text-primary"]
    Text --> TextSecondary["--ods-text-secondary"]
    Text --> TextMuted["--ods-text-muted"]
    
    Border --> BorderDefault["--ods-border"]
    Border --> BorderHover["--ods-border-hover"]
    
    Accent --> AccentDefault["--ods-accent"]
    Accent --> AccentHover["--ods-accent-hover"]
    
    style ODSTokens fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Background fill:#50C878,stroke:#2E7D4E,color:#fff
    style Text fill:#9B59B6,stroke:#6C3483,color:#fff
    style Border fill:#E67E22,stroke:#A04000,color:#fff
    style Accent fill:#E74C3C,stroke:#922B21,color:#fff
```

---

## Integration Patterns

### Frontend Module Integration

```mermaid
flowchart TD
    FrontendCore["Frontend Core<br/>Components"]
    
    FrontendMain["Frontend Main<br/>Application"]
    FrontendChat["Frontend Chat<br/>Client"]
    MingoAI["Mingo AI<br/>Assistant"]
    
    FrontendMain -->|"uses"| Header["Header Component"]
    FrontendMain -->|"uses"| Table["Table Component"]
    FrontendMain -->|"uses"| Theme["Theme Provider"]
    
    FrontendChat -->|"uses"| ChatTypes["Chat Types"]
    FrontendChat -->|"uses"| ChatHooks["Chat Hooks"]
    FrontendChat -->|"uses"| ChatUI["Chat UI"]
    
    MingoAI -->|"extends"| ChatTypes
    MingoAI -->|"uses"| ChatUI
    
    Header --> FrontendCore
    Table --> FrontendCore
    Theme --> FrontendCore
    ChatTypes --> FrontendCore
    ChatHooks --> FrontendCore
    ChatUI --> FrontendCore
    
    style FrontendCore fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style FrontendMain fill:#50C878,stroke:#2E7D4E,color:#fff
    style FrontendChat fill:#9B59B6,stroke:#6C3483,color:#fff
    style MingoAI fill:#E67E22,stroke:#A04000,color:#fff
```

### Backend Service Integration

```mermaid
flowchart LR
    FrontendCore["Frontend Core<br/>Components"]
    
    APIService["API Service<br/>REST + GraphQL"]
    Gateway["Gateway Service<br/>Routing"]
    AuthService["Authorization Service<br/>OAuth2"]
    NATS["NATS Server<br/>WebSocket"]
    
    FrontendCore -->|"HTTP requests"| Gateway
    Gateway -->|"routes to"| APIService
    Gateway -->|"routes to"| AuthService
    
    FrontendCore -->|"WebSocket"| NATS
    NATS -->|"publishes"| APIService
    
    APIService -->|"queries"| MongoDB["MongoDB"]
    APIService -->|"queries"| Pinot["Apache Pinot"]
    
    style FrontendCore fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Gateway fill:#50C878,stroke:#2E7D4E,color:#fff
    style APIService fill:#9B59B6,stroke:#6C3483,color:#fff
    style NATS fill:#E67E22,stroke:#A04000,color:#fff
    style AuthService fill:#E74C3C,stroke:#922B21,color:#fff
```

---

## Component Lifecycle

### Chat Component Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Initializing
    
    Initializing --> LoadingHistory: Fetch historical messages
    LoadingHistory --> ProcessingHistory: Messages received
    ProcessingHistory --> Connected: Connect to NATS
    
    Connected --> Idle: Ready for input
    
    Idle --> Sending: User sends message
    Sending --> Streaming: AI response starts
    
    Streaming --> DisplayingText: TEXT chunks
    Streaming --> ExecutingTool: EXECUTING_TOOL chunk
    Streaming --> RequestingApproval: APPROVAL_REQUEST chunk
    
    ExecutingTool --> Streaming: Continue streaming
    
    RequestingApproval --> WaitingApproval: Show approval UI
    WaitingApproval --> Streaming: User approves/rejects
    
    DisplayingText --> Streaming: More chunks
    Streaming --> MessageComplete: MESSAGE_END chunk
    
    MessageComplete --> Idle: Ready for next message
    
    Connected --> Disconnected: Connection lost
    Disconnected --> Reconnecting: Attempt reconnect
    Reconnecting --> Connected: Reconnected
    Reconnecting --> [*]: Failed to reconnect
```

### Table Component Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Initializing
    
    Initializing --> Loading: Fetch data
    Loading --> Rendering: Data received
    
    Rendering --> Idle: Display table
    
    Idle --> Sorting: User clicks sort
    Sorting --> Rendering: Re-render sorted
    
    Idle --> Filtering: User applies filter
    Filtering --> Rendering: Re-render filtered
    
    Idle --> Selecting: User selects rows
    Selecting --> Idle: Update selection
    
    Idle --> Paginating: User changes page
    Paginating --> Loading: Fetch next page
    
    Idle --> BulkAction: User clicks bulk action
    BulkAction --> Processing: Execute action
    Processing --> Loading: Refresh data
    
    Idle --> [*]: Component unmounts
```

---

## Performance Optimization

### Component Optimization Strategy

```mermaid
flowchart TD
    Performance["Performance Optimization"]
    
    Performance --> Memoization["React.memo"]
    Performance --> Callbacks["useCallback"]
    Performance --> Effects["useEffect"]
    Performance --> Lazy["Lazy Loading"]
    
    Memoization --> MemoComponents["Memoize expensive<br/>component renders"]
    
    Callbacks --> MemoCallbacks["Memoize callback<br/>functions"]
    
    Effects --> OptimizeEffects["Optimize effect<br/>dependencies"]
    
    Lazy --> CodeSplitting["Code splitting<br/>for large components"]
    Lazy --> VirtualScrolling["Virtual scrolling<br/>for long lists"]
    
    style Performance fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Memoization fill:#50C878,stroke:#2E7D4E,color:#fff
    style Callbacks fill:#9B59B6,stroke:#6C3483,color:#fff
    style Effects fill:#E67E22,stroke:#A04000,color:#fff
    style Lazy fill:#E74C3C,stroke:#922B21,color:#fff
```

---

## Quick Reference

### Component Import Map

| Component | Import Path | Type Import |
|-----------|-------------|-------------|
| **Chat** | `import { ChatContainer } from '@openframe/frontend-core'` | `import type { Message } from '@openframe/frontend-core'` |
| **Navigation** | `import { Header } from '@openframe/frontend-core'` | `import type { HeaderConfig } from '@openframe/frontend-core'` |
| **Table** | `import { Table } from '@openframe/frontend-core'` | `import type { TableProps } from '@openframe/frontend-core'` |
| **Theme** | `import { DynamicThemeProvider } from '@openframe/frontend-core'` | `import type { DynamicThemeContextType } from '@openframe/frontend-core'` |

### Feature Availability Matrix

| Feature | Chat | Navigation | Table | Theme |
|---------|------|------------|-------|-------|
| **Real-time Updates** | ✅ | ❌ | ❌ | ✅ |
| **Responsive Design** | ✅ | ✅ | ✅ | N/A |
| **Dark Mode** | ✅ | ✅ | ✅ | ✅ |
| **TypeScript** | ✅ | ✅ | ✅ | ✅ |
| **Custom Styling** | ✅ | ✅ | ✅ | ✅ |
| **Accessibility** | ✅ | ✅ | ✅ | ✅ |
| **Mobile Support** | ✅ | ✅ | ✅ | N/A |
| **Loading States** | ✅ | ❌ | ✅ | N/A |

---

## Documentation Navigation

### Start Here
1. **[README](./FRONTEND_CORE_COMPONENTS_README.md)** - Quick start guide
2. **[Main Documentation](./frontend_core_components.md)** - Complete overview
3. **[Summary](./FRONTEND_CORE_COMPONENTS_SUMMARY.md)** - Quick reference

### Deep Dive
- **[Chat System](./frontend_core_chat_system.md)** - Real-time messaging
- **[Navigation](./frontend_core_navigation.md)** - Header and menus
- **[Table](./frontend_core_ui_table.md)** - Data tables
- **[Theme](./frontend_core_theme_provider.md)** - Theming system

---

**Visual Overview Complete** ✅

For detailed documentation, see [Frontend Core Components](./frontend_core_components.md)
