# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the OpenFrame Frontend service.

## Project Overview

OpenFrame Frontend is a **pure React client-side application** that serves as the web interface for the OpenFrame platform. This is a client-side only application with no server-side rendering.

### Key Principles
- **Pure Client-Side**: No server-side rendering, pure React SPA
- **100% UI-Kit Design System**: All UI components must come from @flamingo/ui-kit
- **Multi-Platform-Hub as Reference**: Use only for learning patterns, NOT for component sharing
- **OpenFrame Platform Focus**: Tailored specifically for OpenFrame branding and theming

## Essential Commands

### Development
```bash
cd openframe/services/openframe-frontend
npm install                                 # Install dependencies
npm run dev                                 # Start development server
npm run build                               # Build for production
npm run preview                             # Preview production build
npm run type-check                          # TypeScript type checking
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
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (client-side only)
- **Routing**: React Router (client-side routing)
- **State Management**: Zustand or Redux Toolkit (client-side state)
- **API Communication**: Apollo Client for GraphQL
- **Styling**: 100% UI-Kit design system + Tailwind CSS
- **Authentication**: Client-side JWT handling

### Project Structure
```
openframe-frontend/
├── src/                                    # Application source code
│   ├── components/                         # Business logic components only
│   ├── pages/                             # Route components
│   ├── hooks/                             # Custom React hooks
│   ├── stores/                            # State management
│   ├── services/                          # API services
│   ├── types/                             # TypeScript type definitions
│   └── lib/                               # Utilities and configurations
├── ui-kit/                                # UI-Kit design system (checked out)
├── multi-platform-hub/                    # Reference only (DO NOT copy)
└── CLAUDE.md                              # This file
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

## Development Patterns

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

### React/TypeScript
- Use React 18+ with TypeScript strict mode
- Functional components with hooks only
- Use TypeScript for all new code
- Follow React best practices for client-side applications
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
- **Components**: Business logic only, wrapping UI-Kit components
- **Pages**: Route components using UI-Kit for UI elements
- **Hooks**: Custom React hooks for business logic
- **Services**: API integration and external service communication

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
- Client-side routing tests

## Important Development Rules

### UI Component Rules
1. **NEVER create custom UI components** - use UI-Kit only
2. **Business logic components** can wrap UI-Kit components
3. **100% UI-Kit design system** - no custom styles for UI elements
4. **Platform theming** is handled automatically by UI-Kit
5. **NO FORMS** - never use `<form>` elements or form submissions
6. **NEVER REPLACE SHARED COMPONENTS WITH MANUAL DESIGN** - If UI-Kit components don't work as expected, fix the underlying issue or use proper ODS theming variables, never replace with hardcoded values

### Multi-Platform-Hub Rules
1. **Reference ONLY** - never copy components
2. **Learn patterns** - study architecture and patterns
3. **No imports** - never import from multi-platform-hub
4. **Client-side focus** - ignore server-side Next.js patterns

### Development Workflow
1. **Use UI-Kit components** for all UI elements  
2. **Reference multi-platform-hub** for learning patterns only
3. **Build business logic** around UI-Kit components
4. **Dynamic loading states** - no form validation, use Button loading prop
5. **State-driven interactions** - all user actions through event handlers
6. **Test with OpenFrame theming** enabled  
7. **Pure client-side** - no server-side rendering
8. **Always use ODS theming** - Use semantic color variables (bg-ods-card, text-ods-text-primary) instead of hardcoded values

## Access URLs

- **Development**: http://localhost:5173 (Vite default)
- **OpenFrame API**: http://localhost:8080/graphql
- **UI-Kit Storybook**: (if available) http://localhost:6006

## Troubleshooting

### Common Issues
- **UI-Kit import errors**: Ensure UI-Kit is properly installed and built
- **Theming issues**: Verify NEXT_PUBLIC_APP_TYPE is set to 'openframe'
- **Component not found**: Check UI-Kit exports, never create custom UI
- **Build errors**: Run type-check on both main project and UI-Kit

### Diagnostic Commands
```bash
# Check UI-Kit build
cd ui-kit && npm run type-check

# Verify component imports
npm run type-check

# Check development server
npm run dev
```