# OpenFrame Frontend Multi-Platform Rebuild Plan

## 📋 Current Status: Multi-Platform Architecture Complete ✅

**Last Updated**: August 21, 2025  
**Progress**: Multi-Platform Migration Complete | Next.js Production Ready

### ✅ Completed Architecture Migration

#### Phase 1: Next.js Multi-Platform Foundation ✅
- ✅ **Complete Architecture Migration**: Migrated from Vite React to Next.js 15 multi-platform structure
- ✅ **Multi-Platform-Hub Pattern**: Implemented exact `app/_components/` structure following multi-platform-hub
- ✅ **Two-App Structure**: OpenFrame-Auth and OpenFrame-Dashboard apps in single codebase
- ✅ **Pure Client-Side Export**: Configured Next.js for static export with no server-side rendering

#### Phase 2: UI-Kit Integration Foundation ✅
- ✅ **@flamingo/ui-kit Integration**: Complete design system implementation with OpenFrame theming
- ✅ **Tailwind Configuration**: Properly configured to extend ui-kit with comprehensive ODS tokens
- ✅ **Global Styles**: Set up with `@import "@flamingo/ui-kit/styles"`
- ✅ **Platform Configuration**: Environment variables configured with `NEXT_PUBLIC_APP_TYPE=openframe`
- ✅ **Development Server**: Running on port 4000 with full ui-kit integration

#### Phase 3: Multi-Platform Component Architecture ✅
- ✅ **OpenFrame-Auth App**: Complete authentication flow in `app/_components/openframe-auth/`
- ✅ **OpenFrame-Dashboard App**: Main dashboard interface in `app/_components/openframe-dashboard/`
- ✅ **Next.js App Router**: File-based routing with proper URL handling
- ✅ **Component Organization**: Exact multi-platform-hub pattern implementation
- ✅ **Protected Routes**: Authentication guards implemented for all routes

### 🎯 Root Cause Resolution
**Problem Solved**: Design inconsistency and architecture fragmentation resolved by:
- Migrating from Vite React to Next.js 15 with multi-platform architecture
- Following exact multi-platform-hub pattern with `app/_components/` structure
- Implementing two distinct apps (Auth and Dashboard) in single codebase
- Maintaining 100% UI-Kit design system consistency with OpenFrame theming

**Solution Implemented**: Complete Next.js multi-platform rebuild ensures architectural consistency with multi-platform-hub while maintaining OpenFrame-specific functionality.

---

## Project Overview

OpenFrame Frontend is now a **pure Next.js client-side application** with multi-platform architecture serving as the web interface for the OpenFrame platform. Following the exact pattern from multi-platform-hub, it provides two distinct apps within a single codebase while leveraging the established `@flamingo/ui-kit` component library and maintaining full compatibility with the existing Spring Boot backend.

## Multi-Platform Architecture

### Two-App Structure
- **OpenFrame-Auth**: Authentication and organization setup (`/auth/*`)
- **OpenFrame-Dashboard**: Main application interface (`/dashboard`, `/devices`, `/settings`)

### Component Organization
Following multi-platform-hub pattern:
```
app/
├── _components/                        # Component directories (multi-platform-hub pattern)
│   ├── openframe-auth/                 # Auth app components
│   │   ├── auth-page.tsx              # Main orchestrator
│   │   ├── auth-benefits-section.tsx   # Shared benefits panel
│   │   ├── auth-choice-section.tsx     # Create org + sign in
│   │   ├── auth-signup-section.tsx     # Registration form
│   │   └── auth-login-section.tsx      # SSO login
│   └── openframe-dashboard/            # Dashboard app components
│       ├── dashboard-page.tsx          # Main dashboard
│       ├── devices-page.tsx            # Device management
│       └── settings-page.tsx           # Settings
├── auth/                               # Auth routes
│   ├── page.tsx                        # /auth
│   ├── signup/page.tsx                 # /auth/signup
│   └── login/page.tsx                  # /auth/login
├── dashboard/page.tsx                  # /dashboard
├── devices/page.tsx                    # /devices
├── settings/page.tsx                   # /settings
├── layout.tsx                          # Root layout
└── page.tsx                            # Root redirect
```

## Phase 1: Next.js Multi-Platform Setup ✅ **COMPLETED**

### 1.1 Next.js Multi-Platform Architecture ✅
- **Framework**: Next.js 15 with React 18 and TypeScript
- **Structure**: Exact multi-platform-hub pattern with `app/_components/`
- **Build**: Pure client-side export (`output: 'export'`)
- **Routing**: Next.js App Router with file-based routing

### 1.2 Core Dependencies & Architecture ✅
```json
{
  "dependencies": {
    "@flamingo/ui-kit": "file:./ui-kit",
    "@apollo/client": "^3.8.0",
    "next": "15.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.4.0",
    "graphql": "^16.8.0",
    "@tanstack/react-query": "^5.80.6"
  }
}
```

### 1.3 Platform Configuration ✅
- Set `NEXT_PUBLIC_APP_TYPE=openframe` for ui-kit theming
- Configure Tailwind to extend ui-kit configuration
- Import ui-kit styles and design tokens
- Pure client-side configuration with static export

## Phase 2: Authentication & Core Infrastructure ✅ **COMPLETED**

### 2.1 Multi-Platform Authentication System ✅
**OpenFrame-Auth App Implementation:**
- Multi-platform component structure in `app/_components/openframe-auth/`
- Next.js App Router with authentication routes
- HTTP-only cookie authentication flow
- OAuth2/OpenID Connect integration preserved
- Endpoint compatibility: `/oauth/me`, `/oauth/token`, `/oauth/logout`

### 2.2 Apollo Client Configuration ✅
**Next.js Apollo Setup:**
- Cookie-based authentication (no Authorization headers)
- Error handling and token refresh logic maintained
- Apollo Client hooks for GraphQL operations
- Backend compatibility preserved

### 2.3 Next.js App Router Setup ✅
**Multi-Platform Routing Structure:**
```
/auth → OpenFrame-Auth App (AuthPage)
/auth/signup → OpenFrame-Auth App (SignupPage)
/auth/login → OpenFrame-Auth App (LoginPage)
/dashboard → OpenFrame-Dashboard App (DashboardPage)
/devices → OpenFrame-Dashboard App (DevicesPage)
/settings → OpenFrame-Dashboard App (SettingsPage)
```

## Phase 3: Multi-Platform Component Migration ✅ **COMPLETED**

### 3.1 OpenFrame-Auth App ✅ **COMPLETED**
**Multi-Platform Authentication Implementation:**
- ✅ `OpenFrameAuthPage` ← Complete authentication flow following multi-platform-hub pattern
- ✅ **Component Structure**: Sections-based architecture in `app/_components/openframe-auth/`
- ✅ **URL Routing Integration**: Next.js App Router with distinct URLs for each auth step
- ✅ **Navigation Integration**: Next.js `useRouter` and `usePathname` hooks

**✅ Implemented Architecture:**
- ✅ **Modular Component Structure**: Split into reusable sections following multi-platform-hub pattern
  - `AuthChoiceSection` - Organization creation and sign-in entry point
  - `AuthSignupSection` - Organization registration with user details
  - `AuthLoginSection` - SSO provider selection and authentication
  - `AuthBenefitsSection` - Shared benefits panel across all screens
- ✅ **Main Orchestrator**: `OpenFrameAuthPage` manages routing, state, and section composition
- ✅ **Next.js Integration**: File-based routing with proper URL synchronization
- ✅ **100% UI-Kit Integration**: All UI components use @flamingo/ui-kit design system

**✅ Implemented Features:**
- ✅ **Next.js App Router**: Browser history support with /auth, /auth/signup, /auth/login routes
- ✅ **State-URL Sync**: Navigation actions update both application state and browser URL
- ✅ **Shared Layout**: AuthBenefitsSection identical across all authentication screens
- ✅ **Dynamic Loading**: Button loading states with state-driven UI updates
- ✅ **OAuth2 Integration**: SSO provider authentication with AuthProvidersList component
- ✅ **Error Handling**: Toast-based error reporting using UI-Kit toast system
- ✅ **Back Navigation**: Proper back button functionality with URL updates

**📦 Component Structure:**
```typescript
// Multi-platform component organization
app/_components/openframe-auth/
├── auth-page.tsx              # Main orchestrator (Next.js client component)
├── auth-choice-section.tsx    # Organization creation and sign-in
├── auth-signup-section.tsx    # User registration form
├── auth-login-section.tsx     # SSO provider selection
└── auth-benefits-section.tsx  # Shared benefits panel

// Next.js App Router integration
app/auth/
├── page.tsx                   # /auth route
├── signup/page.tsx            # /auth/signup route
└── login/page.tsx             # /auth/login route
```

**📊 Next.js Navigation Flow:**
```typescript
// Next.js navigation with proper URL updates
'use client'
import { useRouter, usePathname } from 'next/navigation'

export function OpenFrameAuthPage() {
  const router = useRouter()
  const pathname = usePathname()
  
  const handleNavigation = (route: string) => {
    router.push(route)  // Updates both state and URL
  }
}
```

### 3.2 OpenFrame-Dashboard App ✅ **COMPLETED**
**Multi-Platform Dashboard Implementation:**
- ✅ `OpenFrameDashboardPage` ← Main application interface
- ✅ **Component Structure**: Dashboard components in `app/_components/openframe-dashboard/`
- ✅ **Card-based Layout**: Device management, monitoring, and remote access cards
- ✅ **Next.js Integration**: File-based routing for dashboard features

## Phase 4: Advanced Multi-Platform Features

### 4.1 Device Management Integration (Next Phase)
**OpenFrame-Dashboard App Extensions:**
- `DevicesPage.tsx` ← Unified device management interface
- Device filtering and search with UI-Kit components
- Real-time device status updates
- Bulk operations interface

### 4.2 Module Integration (Upcoming)
**Multi-Platform Module Structure:**
- MDM Module components in `app/_components/openframe-dashboard/mdm/`
- RMM Module components in `app/_components/openframe-dashboard/rmm/`
- RAC Module components in `app/_components/openframe-dashboard/rac/`

### 4.3 Settings & Configuration (Upcoming)
**Settings App Components:**
- Settings pages in `app/_components/openframe-dashboard/settings/`
- SSO configuration management
- API keys and profile management
- System configuration interface

## Phase 5: Data Layer & State Management

### 5.1 GraphQL Integration
**Next.js Apollo Client:**
- Apollo Client configured for Next.js client components
- Maintain exact same query structure for backend compatibility
- Convert to React Apollo hooks pattern
- Preserve cookie-based authentication

### 5.2 State Management Migration
**Zustand State Management:**
```typescript
// Next.js Zustand store implementation
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null })
}))
```

### 5.3 Custom Hooks Conversion
**Next.js Custom Hooks:**
- Convert Vue composables to React hooks
- Maintain functionality with Next.js client components
- Preserve backend API compatibility

## Phase 6: UI Component Strategy

### 6.1 @flamingo/ui-kit Integration
**Multi-Platform UI Components:**
- Button, Card, Input, Modal, Table, Badge from ui-kit
- Form components (Input, Select, Checkbox, Switch)
- Navigation (Sidebar, Menu, Breadcrumb)
- Feedback (Toast, Alert, Progress)
- OpenFrame theming automatically applied

### 6.2 Multi-Platform Custom Components
**Business Logic Components:**
- Components wrap UI-Kit components only
- Follow multi-platform-hub patterns
- Organize by app structure (`openframe-auth/`, `openframe-dashboard/`)

## Phase 7: Testing & Quality Assurance

### 7.1 Next.js Testing Strategy
- **Unit Tests**: React Testing Library for Next.js components
- **Integration Tests**: Apollo Client mocking with Next.js
- **E2E Tests**: Playwright for multi-platform user journeys

### 7.2 Multi-Platform Validation
- Feature parity with existing Vue application
- Performance benchmarking for Next.js static export
- Cross-platform accessibility audit
- Multi-browser testing

## Phase 8: Deployment & Production

### 8.1 Next.js Build Configuration
- Static export configuration for pure client-side deployment
- Environment variable management for multi-platform
- Production build optimization
- Docker configuration for Next.js static files

### 8.2 Multi-Platform Migration Strategy
1. Deploy Next.js multi-platform app alongside Vue app
2. Route specific app sections to Next.js gradually
3. Monitor performance and multi-platform functionality
4. Complete migration once stable
5. Deprecate Vue application

## Key Implementation Details

### Multi-Platform Authentication Flow
```typescript
// Next.js client component authentication
'use client'
export function OpenFrameAuthPage() {
  // HTTP-only cookies, same /oauth endpoints
  // No changes to backend authentication
  // Multi-platform component structure
}
```

### Next.js App Router Integration
```typescript
// File-based routing with multi-platform structure
app/auth/page.tsx → OpenFrame-Auth App
app/dashboard/page.tsx → OpenFrame-Dashboard App
app/_components/openframe-auth/ → Auth app components
app/_components/openframe-dashboard/ → Dashboard app components
```

### UI Kit Multi-Platform Integration
```typescript
'use client'
import { Button, Card, Modal } from '@flamingo/ui-kit/components/ui'
import '@flamingo/ui-kit/styles'

// OpenFrame theming automatically applied
const DeviceCard = () => (
  <Card className="device-card">
    <Button variant="primary">Manage Device</Button>
  </Card>
)
```

## Timeline & Milestones

**Phase 1-3**: ✅ Multi-platform architecture and authentication complete
**Phase 4**: Device management and module integration (2 weeks)
**Phase 5**: Data layer and state management (1 week)
**Phase 6**: UI component completion (1 week)
**Phase 7**: Testing and quality assurance (1 week)
**Phase 8**: Production deployment (1 week)

**Total Remaining Duration**: 6 weeks for complete feature parity

## Risk Mitigation

1. **Backend Compatibility**: No API changes required - GraphQL and authentication preserved
2. **Authentication Security**: Maintain HTTP-only cookie flow with Next.js
3. **Feature Parity**: Systematic multi-platform component migration
4. **Performance**: Leverage Next.js static export and React 18
5. **Design Consistency**: Use established ui-kit components with OpenFrame theming
6. **Architecture**: Follow proven multi-platform-hub patterns

## Success Criteria

- ✅ Multi-platform architecture following multi-platform-hub pattern
- ✅ Two-app structure (OpenFrame-Auth and OpenFrame-Dashboard) in single codebase
- ✅ Next.js App Router with pure client-side export
- ✅ 100% UI-Kit design system integration with OpenFrame theming
- ✅ Complete authentication flow with multi-platform component structure
- ◯ 100% feature parity with existing Vue application
- ◯ Same authentication and security model
- ◯ Improved performance with Next.js optimization
- ◯ Zero backend API changes required
- ◯ Comprehensive test coverage
- ◯ Successful production deployment

**Current Status**: Multi-platform foundation complete, ready for feature expansion and production deployment.