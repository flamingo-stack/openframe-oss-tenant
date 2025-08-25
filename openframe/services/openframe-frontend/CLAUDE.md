# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the OpenFrame Frontend service.

## Project Overview

OpenFrame Frontend is a **pure Next.js client-side application** with multi-platform architecture serving as the web interface for the OpenFrame platform. Following the exact pattern from multi-platform-hub, it provides two distinct apps within a single codebase:

- **OpenFrame-Auth**: Authentication and organization setup (`/auth/*`)
- **OpenFrame-Dashboard**: Main application interface (`/dashboard`, `/devices`, `/settings`)

This pure client-side application provides a responsive, user-friendly interface for managing devices, monitoring systems, and configuring the OpenFrame platform.

### Key Principles
- **Pure Client-Side Architecture**: No server-side rendering, optimized for performance
- **Multi-Platform Structure**: Follows exact multi-platform-hub pattern with app/_components
- **100% UI-Kit Design System**: All UI components must come from @flamingo/ui-kit
- **Multi-Platform-Hub as Reference**: Use only for learning patterns, NOT for component sharing
- **OpenFrame Platform Focus**: Tailored specifically for OpenFrame branding and theming

## Essential Commands

### Development
```bash
cd openframe/services/openframe-frontend
npm install                                 # Install dependencies
npm run dev                                 # Start development server (foreground)
nohup npm run dev > dev.log 2>&1 &         # Start development server (background)
npm run build                               # Build for production
npm run preview                             # Preview production build
npm run type-check                          # TypeScript type checking
```

### Important: API URL Configuration
When running against the Kubernetes cluster, ensure the API URL is correctly set:
```bash
# Set via environment variable
NEXT_PUBLIC_API_URL=http://localhost/api npm run dev

# Or use .env.local file (preferred)
echo "NEXT_PUBLIC_API_URL=http://localhost/api" >> .env.local
echo "NEXT_PUBLIC_CLIENT_ID=openframe_web_dashboard" >> .env.local
echo "NEXT_PUBLIC_CLIENT_SECRET=prod_secret" >> .env.local
```

### UI-Kit Integration
```bash
cd openframe/services/openframe-frontend/ui-kit
npm install                                 # Install UI-Kit dependencies
npm run type-check                          # Check UI-Kit types
```

### Reference Exploration (Read-Only)
```bash
cd openframe/services/openframe-frontend/multi-platform-hub
npm run dev                                 # Explore multi-platform-hub for patterns
# NOTE: This is for reference only - DO NOT copy components
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with React 18 and TypeScript (PURE CLIENT-SIDE ONLY)
- **Build Tool**: Next.js (pure client-side export - NO SERVER-SIDE FEATURES)
- **Routing**: Next.js App Router (file-based routing - CLIENT-SIDE ONLY)
- **CRITICAL**: NO API ROUTES - Pure static export only
- **State Management**: Zustand
- **API Client**: Apollo Client (GraphQL)
- **UI Components**: @flamingo/ui-kit
- **Styling**: Tailwind CSS + UI-Kit design tokens
- **Authentication**: JWT with HTTP-only cookies

### Multi-Platform Project Structure

Following the exact pattern from multi-platform-hub:

```
openframe-frontend/
├── app/                                    # Next.js app directory
│   ├── _components/                        # Component directories (multi-platform-hub pattern)
│   │   ├── openframe-auth/                 # Auth app components
│   │   │   ├── auth-page.tsx              # Main orchestrator
│   │   │   ├── auth-benefits-section.tsx   # Shared benefits panel
│   │   │   ├── auth-choice-section.tsx     # Create org + sign in
│   │   │   ├── auth-signup-section.tsx     # Registration form
│   │   │   └── auth-login-section.tsx      # SSO login
│   │   └── openframe-dashboard/            # Dashboard app components
│   │       ├── dashboard-page.tsx          # Main dashboard
│   │       ├── devices-page.tsx            # Device management
│   │       └── settings-page.tsx           # Settings
│   ├── auth/                               # Auth routes
│   │   ├── page.tsx                        # /auth
│   │   ├── signup/page.tsx                 # /auth/signup
│   │   └── login/page.tsx                  # /auth/login
│   ├── dashboard/page.tsx                  # /dashboard
│   ├── devices/page.tsx                    # /devices
│   ├── settings/page.tsx                   # /settings
│   ├── layout.tsx                          # Root layout
│   ├── globals.css                         # Global styles
│   └── page.tsx                            # Root redirect
├── hooks/                                  # Custom hooks
│   └── use-auth.ts                         # Authentication hook
├── ui-kit/                                 # UI-Kit design system (existing)
├── multi-platform-hub/                    # Reference only (existing)
├── public/                                 # Static assets
└── next.config.mjs                        # Next.js configuration
```

## UI-Kit Integration (PRIMARY FOCUS)

### Component Usage Guidelines
All UI components MUST come from @flamingo/ui-kit. No custom UI components are allowed.

#### Importing Components
```typescript
// Core UI Components
import { Button, Card, Modal } from '@flamingo/ui-kit/components/ui'

// Feature Components  
import { AuthProvidersList, AuthTrigger } from '@flamingo/ui-kit/components/features'

// Hooks
import { useDebounce, useLocalStorage } from '@flamingo/ui-kit/hooks'

// Utilities
import { cn, getPlatformAccentColor } from '@flamingo/ui-kit/utils'

// Styles (required)
import '@flamingo/ui-kit/styles'
```

#### Available UI-Kit Components
- **Core UI**: Button, Card, Modal, Input, Textarea, Checkbox, Switch, Toast
- **Layout**: Pagination, Slider (when needed)
- **Authentication**: AuthProvidersList, AuthTrigger, ProviderButton
- **Business**: CommentCard, VendorIcon, JoinWaitlistButton (if applicable)
- **Icons**: GitHubIcon, XLogo, OpenFrameLogo, etc.

#### OpenFrame Platform Theming
UI-Kit automatically adapts to OpenFrame platform via:
```typescript
// Platform is detected automatically
process.env.NEXT_PUBLIC_APP_TYPE = 'openframe'

// UI-Kit components will use OpenFrame theming
<Button variant="primary">OpenFrame Button</Button>
```

### Custom Component Guidelines
Only business logic components are allowed - they must wrap UI-Kit components:

```typescript
// GOOD: Business logic component using UI-Kit
import { Card, Button } from '@flamingo/ui-kit/components/ui'

export function DeviceCard({ device, onAction }) {
  return (
    <Card>
      <h3>{device.name}</h3>
      <p>{device.status}</p>
      <Button onClick={() => onAction(device.id)}>
        Manage Device
      </Button>
    </Card>
  )
}

// BAD: Custom UI component
export function CustomButton({ children }) {
  return <button className="custom-styles">{children}</button>
}
```

## Multi-Platform-Hub Reference Guidelines

The multi-platform-hub is included **ONLY as a reference** for learning patterns. It should NOT be used for component sharing.

### What to Reference
- **React Patterns**: Study authentication flows, state management patterns
- **Architecture Patterns**: Learn from component organization and structure  
- **API Integration**: Understand GraphQL integration patterns
- **Routing Patterns**: Study client-side routing implementations

### What NOT to Do
- ❌ Copy components from multi-platform-hub
- ❌ Import multi-platform-hub components
- ❌ Use multi-platform-hub as a dependency
- ❌ Copy server-side Next.js patterns

### Correct Usage
```typescript
// GOOD: Learn from patterns but implement with UI-Kit
// Study: multi-platform-hub/components/auth/auth-provider.tsx
// Implement: Use UI-Kit AuthProvidersList component

import { AuthProvidersList } from '@flamingo/ui-kit/components/features'

function LoginPage() {
  return (
    <div>
      <AuthProvidersList 
        enabledProviders={providers}
        onProviderClick={handleAuth}
      />
    </div>
  )
}
```

## Multi-Platform Architecture (Updated 2025-08-21)

### App Structure
Following the exact multi-platform-hub pattern, the application provides two distinct apps:

#### OpenFrame-Auth App (`/auth/*`)
- **Route**: `/auth`, `/auth/signup`, `/auth/login`  
- **Components**: `app/_components/openframe-auth/`
- **Purpose**: Authentication and organization setup

#### OpenFrame-Dashboard App (`/dashboard`, `/devices`, `/settings`)
- **Routes**: `/dashboard`, `/devices`, `/settings`
- **Components**: `app/_components/openframe-dashboard/`
- **Purpose**: Main application interface

### Component Organization
Components are organized into the `app/_components/` directory following multi-platform-hub:

```typescript
// app/_components/openframe-auth/auth-page.tsx
'use client'
import { useRouter, usePathname } from 'next/navigation'

export function OpenFrameAuthPage() {
  const router = useRouter()
  const pathname = usePathname()
  
  // Authentication logic with URL synchronization
}
```

### Navigation Pattern
Next.js App Router with file-based routing:

```typescript
import { useRouter } from 'next/navigation'

function MyComponent() {
  const router = useRouter()
  
  const handleSubmit = () => {
    router.push('/auth/signup')  // Navigate to signup
  }
}
```

**Available Routes**:
- `/auth` → Auth choice screen
- `/auth/signup` → Registration form  
- `/auth/login` → SSO provider selection
- `/dashboard` → Main dashboard
- `/devices` → Device management
- `/settings` → Application settings

### Authentication Component Structure
All auth screens share the exact same layout with modular sections:

```typescript
// Main auth page following multi-platform-hub pattern
<div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
  <AuthChoiceSection />      {/* Left side - forms */}
  <AuthBenefitsSection />    {/* Right side - identical across screens */}
</div>
```

**Benefits of New Structure**:
- ✅ **100% Shared Benefits Panel**: Identical right side across all auth screens
- ✅ **URL Synchronization**: Back button properly updates URLs
- ✅ **Reusable Sections**: Each auth step is an independent component
- ✅ **Multi-Platform Pattern**: Follows established architecture from multi-platform-hub

## Development Patterns

### Toast System for Error Reporting (MANDATORY PATTERN)
ALWAYS use the unified toast system for error reporting. This is a MANDATORY pattern for all custom hooks and components.

**Setup**: Add `<Toaster />` from 'sonner' to your App.tsx:
```typescript
import { Toaster } from 'sonner';

export const App = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
      <Toaster />
    </ApolloProvider>
  );
};
```

**MANDATORY Usage Pattern**: ALL API calls MUST use `use...` hook pattern with `useToast`:
```typescript
import { useToast } from '@flamingo/ui-kit/hooks';

// MANDATORY: All API operations must be in custom hooks with use... pattern
export function useAuth() {
  const { toast } = useToast() // ← REQUIRED for all API hooks
  
  const discoverTenants = async (email: string) => {
    try {
      const response = await fetch(`/api/sas/tenant/discover?email=${email}`)
      // Handle response...
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: error.message || "Unable to check for existing accounts",
        variant: "destructive"
      })
    }
  }
  
  const registerOrganization = async (data: RegisterRequest) => {
    try {
      const response = await fetch('/api/sas/oauth/register', { 
        method: 'POST',
        body: JSON.stringify(data)
      })
      toast({
        title: "Success!",
        description: "Organization created successfully",
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Registration Failed", 
        description: error.message || "Unable to create organization",
        variant: "destructive"
      })
    }
  }
  
  return { discoverTenants, registerOrganization, ... }
}

// EXAMPLE: Device management hook
export function useDevices() {
  const { toast } = useToast() // ← REQUIRED
  
  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      return await response.json()
    } catch (error) {
      toast({
        title: "Fetch Failed",
        description: "Unable to load devices",
        variant: "destructive"
      })
    }
  }
  
  return { fetchDevices, ... }
}

// MANDATORY: Components using hooks with error handling must also use useToast
function AuthComponent() {
  const { toast } = useToast() // ← REQUIRED for components with error handling
  const { discoverTenants } = useAuth()
  
  const handleSubmit = async () => {
    try {
      await discoverTenants(email)
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Unable to check for existing accounts",
        variant: "destructive"
      })
    }
  }
}
```

**Toast Variants**:
- `variant: "destructive"` - For errors and failures
- `variant: "success"` - For successful operations
- `variant: "default"` - For informational messages

### Authentication Integration
Use UI-Kit authentication components for OpenFrame SSO with dynamic loading states:

```typescript
import { AuthProvidersList } from '@flamingo/ui-kit/components/features'
import { Button } from '@flamingo/ui-kit/components/ui'

function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleProviderClick = async (provider: string) => {
    setIsLoading(true)
    try {
      // Implement OpenFrame OAuth flow with dynamic loading
      await authService.signInWithSSO(provider)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Dynamic loading - no forms, only state-driven UI updates
      await authService.login(email, password)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Dynamic loading states with UI-Kit components */}
      <Button 
        variant="primary" 
        loading={isLoading}
        onClick={() => handleSubmit(email, password)}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
      
      <AuthProvidersList
        enabledProviders={[
          { provider: 'google', enabled: true },
          { provider: 'microsoft', enabled: true }
        ]}
        onProviderClick={handleProviderClick}
        loading={isLoading}
        orientation="vertical"
      />
    </div>
  )
}
```

### API Integration
Use Apollo Client for OpenFrame GraphQL backend:

```typescript
import { useQuery } from '@apollo/client'
import { Card } from '@flamingo/ui-kit/components/ui'

function Dashboard() {
  const { data, loading } = useQuery(GET_DEVICES_QUERY)
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {data.devices.map(device => (
        <Card key={device.id}>
          {/* Device content using UI-Kit components */}
        </Card>
      ))}
    </div>
  )
}
```

### State Management
Use client-side state management for application state:

```typescript
import { create } from 'zustand'

interface AuthState {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null })
}))
```

## Code Standards

### Next.js/React/TypeScript
- Use Next.js 15 with React 18 and TypeScript strict mode
- Functional components with hooks only ('use client' where needed)
- Use TypeScript for all new code
- Follow Next.js App Router patterns for pure client-side applications
- **NO FORMS**: Use dynamic loading states and event handlers only
- **State-Driven UI**: All interactions through state updates, not form submissions

### UI Components
- **MANDATORY**: All UI components from @flamingo/ui-kit
- **NO CUSTOM UI**: Only business logic components allowed
- **NO FORMS**: Replace `<form>` elements with state-driven interactions
- **Dynamic Loading**: Use Button loading states and UI feedback instead of form validation
- **Design System**: Use UI-Kit design tokens exclusively
- **OpenFrame Theming**: Let UI-Kit handle platform-specific theming

### Project Organization
- **app/_components/**: Business logic components organized by app (openframe-auth, openframe-dashboard)
- **app/*/page.tsx**: Route components that import from _components
- **hooks/**: Custom React hooks for business logic
- **lib/**: Utilities, configurations, and API services

## Testing Strategy

### Client-Side Testing
```bash
npm test                                    # Run all tests
npm run test:watch                          # Watch mode
npm run test:coverage                       # Coverage report
```

- Unit tests for business logic components
- Integration tests for API services  
- UI component testing using UI-Kit components
- Next.js App Router navigation tests

## Important Development Rules

### UI Component Rules
1. **NEVER create custom UI components** - use UI-Kit only
2. **Business logic components** can wrap UI-Kit components
3. **100% UI-Kit design system** - no custom styles for UI elements
4. **Platform theming** is handled automatically by UI-Kit
5. **NO FORMS** - never use `<form>` elements or form submissions
6. **NEVER REPLACE SHARED COMPONENTS WITH MANUAL DESIGN** - If UI-Kit components don't work as expected, fix the underlying issue or use proper ODS theming variables, never replace with hardcoded values
7. **ALWAYS USE TOAST FOR ERROR REPORTING** - Use `useToast` hook from UI-Kit for all error/success messages, never create custom error divs
8. **MANDATORY use... HOOK PATTERN** - ALL API calls must be wrapped in custom hooks with `use...` naming pattern
9. **MANDATORY useToast IN ALL API HOOKS** - Every `use...` hook with API calls MUST include `const { toast } = useToast()` for error handling

### Multi-Platform-Hub Rules
1. **Reference ONLY** - never copy components
2. **Learn patterns** - study architecture and patterns
3. **No imports** - never import from multi-platform-hub
4. **App structure** - follow the exact _components pattern
5. **Pure client-side** - use 'use client' directive, no server components

### Development Workflow
1. **Use UI-Kit components** for all UI elements  
2. **Reference multi-platform-hub** for learning patterns only
3. **Build business logic** around UI-Kit components
4. **Follow app/_components structure** for multi-platform organization
5. **Dynamic loading states** - no form validation, use Button loading prop
6. **State-driven interactions** - all user actions through event handlers
7. **Test with OpenFrame theming** enabled  
8. **Pure client-side** - use 'use client' directive, static export only
9. **Always use ODS theming** - Use semantic color variables (bg-ods-card, text-ods-text-primary) instead of hardcoded values
10. **MANDATORY use... HOOK PATTERN** - ALL new/existing API calls must be in custom hooks with `use...` naming
11. **MANDATORY useToast IN ALL API HOOKS** - Every API hook must implement `const { toast } = useToast()` for error handling
12. **NO SERVER-SIDE FEATURES** - No API routes, no server components, no SSR - PURE STATIC CLIENT-SIDE ONLY

## Access URLs

### Application Routes
- **Development**: http://localhost:4000 (configured port)
- **Auth App**: http://localhost:4000/auth (OpenFrame-Auth)
- **Dashboard App**: http://localhost:4000/dashboard (OpenFrame-Dashboard)
- **Device Management**: http://localhost:4000/devices
- **Settings**: http://localhost:4000/settings

### API Endpoints
- **OpenFrame API (K8s)**: http://localhost/api
- **OpenFrame GraphQL (K8s)**: http://localhost/api/graphql
- **OpenFrame API (Local)**: http://localhost:8100/api (when running gateway in debug mode)
- **UI-Kit Storybook**: (if available) http://localhost:6006

## Browser Automation with Browser MCP

### Overview
Browser MCP is a Model Context Protocol (MCP) server that enables AI-powered browser automation. It can be used to automate testing, UI interactions, and browser-based tasks for the OpenFrame Frontend.

### Setup Instructions
1. **Install Browser MCP Chrome Extension**
   - Visit the Chrome Web Store and install the Browser MCP extension
   - Or download from: https://chromewebstore.google.com/detail/browser-mcp-automate-your/bjfgambnhccakkhmkepdoekmckoijdlc

2. **Configure MCP Server**
   - Follow setup instructions at: https://docs.browsermcp.io/setup-server
   - The MCP server connects your AI tools (Claude, Cursor, VS Code) to the browser

3. **Enable in Your AI Tool**
   - For Claude Desktop: Configure MCP settings to include Browser MCP
   - For Cursor/VS Code: Install the Browser MCP extension and configure

### Use Cases for OpenFrame Frontend

#### Automated Testing
```typescript
// Example: Test authentication flow
// Claude/Cursor can automate this via Browser MCP
// 1. Navigate to login page
// 2. Click SSO provider button
// 3. Complete OAuth flow
// 4. Verify redirect to dashboard
```

#### UI Component Testing
```typescript
// Test UI-Kit components in real browser environment
// 1. Navigate to component demo page
// 2. Interact with buttons, modals, forms
// 3. Capture screenshots for visual regression
// 4. Test responsive behavior
```

#### Development Workflow Automation
- Auto-refresh browser on code changes
- Capture console logs and errors
- Take screenshots of UI states
- Test different user flows
- Verify GraphQL API integrations

### Browser MCP Commands
When using Claude/Cursor with Browser MCP enabled:
- `navigate to [URL]` - Open a page
- `click on [element]` - Click UI elements
- `type [text] in [field]` - Fill input fields
- `take screenshot` - Capture current state
- `get console logs` - Retrieve browser console output

### Integration with OpenFrame Development
1. **Start the development server**: `npm run dev`
2. **Enable Browser MCP** in your AI tool
3. **Use AI to automate**:
   - Testing authentication flows with UI-Kit components
   - Verifying OpenFrame theming
   - Testing GraphQL queries and mutations
   - Checking responsive design
   - Debugging client-side routing

### Best Practices
- Use Browser MCP for repetitive testing tasks
- Automate visual regression testing
- Test error states and edge cases
- Verify toast notifications appear correctly
- Check loading states for dynamic components

## Debugging Session Instructions

Every debugging session should follow these steps to ensure a clean environment:

### 1. Kill Existing Processes on Port 4000
```bash
# Find and kill any process using port 4000
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Alternative for Linux
# fuser -k 4000/tcp 2>/dev/null || true

# Alternative for Windows
# netstat -ano | findstr :4000
# taskkill /PID <PID> /F
```

### 2. Start Frontend Development Server
```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies if needed
npm install

# IMPORTANT: Set correct API URL for K8s cluster
export NEXT_PUBLIC_API_URL=http://localhost/api
export NEXT_PUBLIC_CLIENT_ID=openframe_web_dashboard
export NEXT_PUBLIC_CLIENT_SECRET=prod_secret

# Start development server in background (use nohup to prevent hanging)
nohup npm run dev > dev.log 2>&1 &
FRONTEND_PID=$!

# Wait for server to start
sleep 5

# Verify server is running
curl http://localhost:4000 || echo "Server not responding"

# Monitor logs
tail -f dev.log
```

### 3. Check Logs and Debug
```bash
# Monitor frontend logs
tail -f ~/.npm/_logs/*.log

# Check browser console for errors
# Use Browser MCP to capture console logs:
# - Navigate to http://localhost:4000
# - Open developer tools or use Browser MCP's get_console_logs

# Check for TypeScript errors
npm run type-check

# Check for build errors
npm run build
```

### Automated Debug Script
Create a debug script for convenience:

```bash
#!/bin/bash
# save as: scripts/debug-frontend.sh

echo "🔧 Starting OpenFrame Frontend Debug Session..."

# Step 1: Kill port 4000
echo "1️⃣ Killing existing processes on port 4000..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Step 2: Set environment variables for K8s cluster
echo "2️⃣ Setting environment variables..."
export NEXT_PUBLIC_API_URL=http://localhost/api
export NEXT_PUBLIC_CLIENT_ID=openframe_web_dashboard
export NEXT_PUBLIC_CLIENT_SECRET=prod_secret

# Step 3: Start frontend
echo "3️⃣ Starting frontend development server..."
cd openframe/services/openframe-frontend
nohup npm run dev > dev.log 2>&1 &
FRONTEND_PID=$!

# Step 4: Wait and check
echo "4️⃣ Waiting for server startup..."
sleep 5

# Step 5: Verify
if curl -s http://localhost:4000 > /dev/null; then
    echo "✅ Frontend running at http://localhost:4000"
    echo "📋 Frontend PID: $FRONTEND_PID"
    echo "🔗 API URL: $NEXT_PUBLIC_API_URL"
else
    echo "❌ Frontend failed to start"
    tail -n 50 dev.log
fi

# Step 6: Monitor (optional)
echo "📊 Monitoring logs (Ctrl+C to stop)..."
tail -f dev.log
```

## Troubleshooting

### Common Issues
- **Port 4000 Already in Use**: Follow step 1 of debugging instructions above
- **UI-Kit import errors**: Ensure UI-Kit is properly installed and built
- **Theming issues**: Verify NEXT_PUBLIC_APP_TYPE is set to 'openframe'
- **Component not found**: Check UI-Kit exports, never create custom UI
- **Build errors**: Run type-check on both main project and UI-Kit
- **Browser MCP connection**: Ensure Chrome extension is installed and MCP server is running

### Diagnostic Commands
```bash
# Check what's using port 4000
lsof -i:4000

# Check UI-Kit build
cd ui-kit && npm run type-check

# Verify component imports
npm run type-check

# Check development server
npm run dev

# View recent npm logs
ls -la ~/.npm/_logs/

# For Browser MCP issues
# 1. Check Chrome extension is enabled
# 2. Verify MCP server is running
# 3. Check AI tool MCP configuration
```