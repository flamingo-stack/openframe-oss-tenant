# OpenFrame Chat Client

A desktop chat application built with Tauri and React.

## Features

- Modern chat interface with dark theme
- Real-time messaging with SSE support
- Configurable quick actions
- Typing indicators
- Message history with auto-scroll
- System tray integration
- Cross-platform desktop app

## Development Setup

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This will start the Tauri app in development mode with hot reload.

### Build for Production

```bash
npm run build
```

## Project Structure

```
chat-client/
├── src/                    # React source code
│   ├── hooks/             # React hooks (useChat, useSSE, etc.)
│   ├── views/             # React components and views
│   ├── services/          # Services (mock SSE service)
│   ├── config/            # Configuration files
│   └── styles/            # CSS and styling
├── src-tauri/             # Tauri backend
│   ├── src/               # Rust source code
│   ├── icons/             # App icons
│   └── tauri.conf.json   # Tauri configuration
└── package.json           # Node.js dependencies
```

## Configuration

### Quick Actions

Edit `src/config/quickActions.json` to customize the available quick action buttons.

### SSE Endpoint

Update the `useChat` hook configuration in `ChatView.tsx` to connect to your SSE endpoint:

```tsx
const { ... } = useChat({ 
  useMock: false, 
  sseUrl: 'your-sse-endpoint-here' 
})
```

## UI Components

The chat interface uses components from the shared UI kit located at `~/flamingo/ui-kit`. This ensures consistency across the OpenFrame ecosystem.

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS v3
- **Desktop**: Tauri v2
- **Build**: Vite
- **Icons**: Lucide React