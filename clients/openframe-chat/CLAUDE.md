# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm install                    # Install dependencies (includes ui-kit setup)
npm run dev                    # Start Tauri app with hot-reload
npm run frontend:dev           # Start Vite dev server only (port 3003)
```

### Building
```bash
npm run build                  # Build frontend for production
make build                     # Full build: clean install, prebuild, Tauri build
make build TARGET=<target>     # Cross-compile for specific target
```

### Rust/Tauri
```bash
cd src-tauri
cargo fmt                      # Format Rust code
cargo fmt -- --check           # Check formatting
cargo clippy --all-targets -- -D warnings  # Lint with clippy
cargo tauri build              # Build Tauri app
cargo tauri dev                # Run Tauri in development mode
```

### Code Quality
```bash
make fmt                       # Format Rust code
make fmt-check                 # Check Rust formatting
make clippy                    # Run clippy linter
make lint                      # Run both fmt-check and clippy
make test                      # Build and test
make clean                     # Clean build artifacts
```

## Architecture Overview

This is a **Tauri-based desktop chat client** with a React frontend and Rust backend. It's part of the OpenFrame ecosystem and integrates with OpenFrame's chat API using secure token-based authentication.

### Key Components

**Frontend (React + TypeScript + Vite)**
- **UI Framework**: React 19 with Vite, using `@flamingo/ui-kit` component library
- **Styling**: TailwindCSS with custom configuration
- **State Management**: React hooks pattern (no external state library)
- **Main View**: `src/views/ChatView.tsx` - primary chat interface
- **Custom Hooks**:
  - `useChat`: Main chat logic, message handling, streaming
  - `useToken`: Token management with Tauri integration
  - `useSSE`: Server-sent events for streaming responses
  - `useChatConfig`: Configuration and quick actions

**Backend (Rust + Tauri 2.x)**
- **Core**: `src-tauri/src/lib.rs` - main application setup with system tray
- **Token Management**:
  - `token_watcher.rs` - watches encrypted token file, decrypts and emits to frontend
  - `token_decryption_service.rs` - AES-256-GCM decryption
- **Commands**: Tauri commands for `get_token`, `get_server_url`, `greet`
- **System Tray**: Persistent tray icon with show/quit menu, hides instead of closes

**Services Layer (Frontend)**
- `chatApiService.ts`: OpenFrame API integration with SSE streaming
- `tokenService.ts`: Token lifecycle management, Tauri event listener
- `sseService.ts`: Server-sent events handling
- `mockChatService.ts`: Mock service for development/testing

### Authentication Flow

1. **Startup**: App launched with CLI args `--openframe-token-path`, `--openframe-secret`, `--serverUrl`
2. **Token Watching**: Rust `TokenWatcher` monitors encrypted token file (5-second poll)
3. **Decryption**: When file changes, decrypt with AES-256-GCM using provided secret
4. **Event Emission**: Emit `token-update` event to frontend via Tauri
5. **Frontend Reception**: `tokenService` listens for events and stores token
6. **API Usage**: `chatApiService` uses token in Authorization Bearer header

### Data Flow

```
User Input → ChatView → useChat hook → chatApiService
                                      ↓
                              OpenFrame API (SSE stream)
                                      ↓
                          Message segments with tool executions
                                      ↓
                              useChat processes and displays
```

### Message Types

Messages support rich content with typed segments:
- **Text**: Standard text content
- **Tool Execution**: Integrated tool calls with parameters and results
- **Streaming**: Incremental message building with SSE

## Project Structure

```
.
├── src/                        # React frontend source
│   ├── views/                  # Main UI views
│   │   └── ChatView.tsx        # Primary chat interface
│   ├── hooks/                  # React custom hooks
│   │   ├── useChat.ts          # Chat logic and state
│   │   ├── useToken.ts         # Token management
│   │   └── useSSE.ts           # Server-sent events
│   ├── services/               # API and service layer
│   │   ├── chatApiService.ts   # OpenFrame API client
│   │   ├── tokenService.ts     # Token lifecycle
│   │   └── sseService.ts       # SSE utilities
│   ├── types/                  # TypeScript type definitions
│   ├── config/                 # Configuration
│   ├── styles/                 # Global styles
│   └── assets/                 # Static assets
├── src-tauri/                  # Rust backend source
│   ├── src/
│   │   ├── lib.rs              # Main Tauri app setup
│   │   ├── main.rs             # Entry point
│   │   ├── token_watcher.rs    # Token file monitoring
│   │   └── token_decryption_service.rs  # AES decryption
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri configuration
│   ├── capabilities/           # Tauri capability definitions
│   └── icons/                  # App icons
├── scripts/
│   └── ensure-ui-kit-built.cjs # Pre-build script for ui-kit
├── Makefile                    # Build and lint commands
├── package.json                # Node dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # TailwindCSS config
└── tsconfig.json               # TypeScript config
```

## Development Patterns

### Adding New Tauri Commands

1. Define command function in `src-tauri/src/lib.rs` with `#[tauri::command]` attribute
2. Add to `invoke_handler` in builder: `tauri::generate_handler![existing, new_command]`
3. Call from frontend using `@tauri-apps/api/core`: `await invoke('command_name', { args })`

### Token Management Pattern

- Token is **never** stored in frontend localStorage or sessionStorage
- Token flows: Rust file watcher → Tauri event → tokenService → API calls
- Services subscribe to token updates via `tokenService.onTokenUpdate(callback)`
- Always check `tokenService.getCurrentToken()` before API calls

### SSE Streaming Pattern

**Library**: Uses `@microsoft/fetch-event-source` with custom resilient wrapper

**Services Architecture**:
- `ResilientSSEConnection` (`src/services/resilientSSEConnection.ts`): Wrapper with retry logic
- `ChatApiService` (`src/services/chatApiService.ts`): Integrates resilient connection with OpenFrame API
- `useSSE` hook (`src/hooks/useSSE.ts`): Exposes connection state to UI components

**Connection States**:
```typescript
enum ConnectionState {
  IDLE = 'idle',           // Not connected
  CONNECTING = 'connecting', // Initial connection attempt
  CONNECTED = 'connected',   // Successfully connected
  RECONNECTING = 'reconnecting', // Attempting to reconnect after failure
  FAILED = 'failed',        // Connection failed (max retries exceeded or fatal error)
  CLOSED = 'closed'         // Manually closed
}
```

**Retry Configuration** (default values):
```typescript
{
  maxRetries: 10,           // Maximum retry attempts
  baseDelay: 1000,          // Initial delay: 1 second
  maxDelay: 30000,          // Maximum delay: 30 seconds
  jitterRatio: 0.5,         // Random 0-50% reduction
  connectionTimeout: 30000  // Connection timeout: 30 seconds
}
```

**Error Classification**:
- **Auth errors (401, 403)**: Don't retry, user needs to re-authenticate
- **Client errors (4xx)**: Don't retry, indicates bad request
- **Server errors (5xx)**: Retry with exponential backoff
- **Network errors**: Retry immediately
- **Timeout errors**: Retry with backoff

**Message Streaming**:
- Start with empty assistant message
- Append segments as they arrive: text chunks, tool executions
- Final message combines all segments
- Handle tool execution segments specially for rich display

**Resumable Streams**:
- Uses `Last-Event-ID` header to resume after disconnection
- Server can send event IDs that client tracks
- On reconnect, sends last received ID to continue from that point

**Accessing Connection State**:
```typescript
const {
  streamMessage,
  connectionState,    // Current connection state
  retryAttempt,      // Current retry attempt number
  retryDelay,        // Delay before next retry (ms)
  getConnectionState // Function to get current state
} = useSSE({ useApi: true, debugMode: true })

// Can display connection status in UI:
// - connectionState === 'connected' → show green indicator
// - connectionState === 'reconnecting' → show yellow "Reconnecting..."
// - retryAttempt > 0 → show "Retry 3/10"
```

### Window Behavior

- Close button **hides** window (doesn't quit)
- System tray provides explicit "Quit" option
- Multiple windows supported: `main` (visible), `invisible` (hidden utility)
- Prevent exit on system shortcuts, hide instead

## UI Component Library

Uses `@flamingo/ui-kit` from GitHub:
- Public repo: https://github.com/flamingo-stack/ui-kit
- Installed from `github:flamingo-stack/ui-kit#main`
- Pre-build script ensures it's built: `scripts/ensure-ui-kit-built.cjs`
- Components: `ChatContainer`, `ChatHeader`, `ChatContent`, `ChatFooter`, `ChatMessageList`, `ChatInput`, `ChatQuickAction`

## Configuration

### Tauri Configuration (`src-tauri/tauri.conf.json`)

- **Product Name**: "Fae Chat"
- **Identifier**: `com.openframe.chat`
- **Dev Server**: `http://127.0.0.1:3003`
- **Build Output**: `../dist`
- **Icons**: Platform-specific in `src-tauri/icons/`

### Vite Configuration

- Dev server on port 3003 (must match Tauri devUrl)
- React plugin enabled
- Build output to `dist/`

### Rust Dependencies

- `tauri` 2.8.5 with tray-icon, image-png features
- `aes-gcm` 0.10 for token decryption
- `notify` 6.1 for file watching (currently used in token_watcher)
- `serde`/`serde_json` for serialization

### Frontend Dependencies (Notable)

- `@microsoft/fetch-event-source`: SSE client with custom headers and retry support
- `@flamingo/ui-kit`: UI component library (from GitHub)
- `@tauri-apps/api`: Tauri frontend API for native functionality
- `react` 19.0: UI framework with concurrent features

## Common Tasks

### Running with OpenFrame Integration

The app expects to be launched by OpenFrame with specific arguments:

```bash
./openframe-chat \
  --openframe-token-path /path/to/encrypted/token \
  --openframe-secret base64EncodedSecret \
  --serverUrl https://api.openframe.example.com
```

### Debugging Token Issues

1. Check Rust logs for token watcher activity: `[INFO] Token received`
2. Check frontend console: `[TOKEN SERVICE] Token received from Rust event`
3. Verify token decryption in `token_decryption_service.rs`
4. Ensure token file exists and is being updated

### Testing Without OpenFrame

Set `useMock: true` in `useChat` hook options to use mock chat service that doesn't require real API connection.

### Updating UI Kit

```bash
npm install @flamingo/ui-kit@github:flamingo-stack/ui-kit#main --force
npm run prebuild  # Ensures ui-kit is built
```

### Troubleshooting SSE Connection Issues

**Enable Debug Mode**:
```typescript
const chat = useChat({ useApi: true, debugMode: true })
```

**Check Connection State**:
```typescript
// In your component
const { connectionState, retryAttempt, retryDelay } = useSSE({ useApi: true })

useEffect(() => {
  console.log('Connection state:', connectionState)
  if (connectionState === ConnectionState.RECONNECTING) {
    console.log(`Retry ${retryAttempt}, next attempt in ${retryDelay}ms`)
  }
}, [connectionState, retryAttempt, retryDelay])
```

**Common Issues**:

1. **Auth Errors (401/403)**:
   - Connection won't retry automatically
   - Check if token is valid: `tokenService.getCurrentToken()`
   - Verify token is being refreshed by Rust watcher
   - Check server logs for auth failures

2. **Connection Keeps Reconnecting**:
   - Check if server is returning 5xx errors
   - Verify API URL is correct: `tokenService.getCurrentApiBaseUrl()`
   - Check network connectivity
   - Look for CORS issues in browser console

3. **Max Retries Exceeded**:
   - Default: 10 retries with exponential backoff (up to 30s)
   - Connection fails after ~5 minutes of retries
   - Check server health and availability
   - Consider increasing maxRetries in RetryConfig

4. **Messages Not Streaming**:
   - Verify SSE events are being sent by server
   - Check browser console for parsing errors
   - Ensure server sends `[DONE]` event to close stream
   - Debug with: `debugMode: true` in ChatApiService

5. **Connection Timeout**:
   - Default timeout: 30 seconds
   - Check network latency
   - Increase `connectionTimeout` in RetryConfig if needed

**Inspect Connection Details**:
```typescript
// In ChatApiService or useSSE hook
const connection = apiService.current.currentConnection
if (connection) {
  console.log('State:', connection.getState())
  console.log('Retry count:', connection.getRetryCount())
  console.log('Last event ID:', connection.getLastEventId())
}
```

**Test Retry Behavior**:
1. Disable network to trigger reconnection
2. Watch console for retry attempts with exponential backoff
3. Re-enable network to see automatic recovery
4. Connection should resume with Last-Event-ID if server supports it

## Technical Notes

### Security Considerations

- Tokens encrypted with AES-256-GCM before storage
- Decryption key passed via CLI (not stored)
- Token never persists in frontend storage
- All API calls use secure HTTPS with Bearer tokens

### Performance

- Token file polled every 5 seconds (balance between responsiveness and overhead)
- SSE streaming with automatic retry and exponential backoff (1s to 30s)
- Connection resilience prevents message loss during network issues
- Resumable streams with Last-Event-ID support
- React 19 for improved rendering performance

### SSE Resilience Features

- **Automatic Retry**: Up to 10 attempts with exponential backoff
- **Error Classification**: Smart retry decisions based on error type
- **Exponential Backoff**: 1s → 2s → 4s → 8s → 16s → 30s (max)
- **Jitter**: Random 0-50% delay reduction prevents thundering herd
- **Last-Event-ID**: Resume streams from last received event
- **Connection States**: Observable connection lifecycle for UI feedback
- **Circuit Breaker**: Stops retrying on persistent auth/client errors

### Platform Support

- Cross-platform: macOS, Linux, Windows
- Platform-specific icons required in `src-tauri/icons/`
- Use `make build TARGET=<target>` for cross-compilation
