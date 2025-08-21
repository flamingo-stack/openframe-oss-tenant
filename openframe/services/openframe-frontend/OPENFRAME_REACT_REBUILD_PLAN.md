# OpenFrame React Frontend Rebuild Plan

## 📋 Current Status: Core Infrastructure Complete ✅

**Last Updated**: July 28, 2025  
**Progress**: Phase 1-3 Complete | Phase 4+ In Progress

### ✅ Completed Phases

#### Phase 1: Clean Environment Setup ✅
- ✅ **Complete Clean Slate**: Deleted everything except `ui-kit/`, `.env*` files, and this plan
- ✅ **Fresh React Project**: Initialized new React + TypeScript + Vite project from scratch
- ✅ **Dependencies Installed**: All required packages including `@flamingo/ui-kit` dependency

#### Phase 2: UI-Kit Integration Foundation ✅
- ✅ **Tailwind Configuration**: Properly configured to extend ui-kit with comprehensive ODS tokens
- ✅ **Global Styles**: Set up `src/index.css` with `@import "@flamingo/ui-kit/styles"`
- ✅ **Platform Configuration**: Environment variables configured with `VITE_PLATFORM_TYPE=openframe`
- ✅ **Font Loading**: Fixed font CSS variables and fallback stacks
- ✅ **Development Server**: Running on port 4000+ with ui-kit integration

#### Phase 3: Authentication & Core Infrastructure ✅
- ✅ **Authentication Store**: Complete Zustand store replacing Vue Pinia auth store
- ✅ **Apollo Client**: Configured with cookie-based authentication and error handling
- ✅ **Router Structure**: Complete router setup matching Vue app with nested routes
- ✅ **TypeScript Environment**: Vite environment types configured with zero compilation errors
- ✅ **Protected Routes**: Authentication guards implemented for all protected pages

### 🎯 Root Cause Resolution
**Problem Solved**: The design inconsistency between OpenFrame and multi-platform-hub was caused by:
- OpenFrame using PrimeVue with custom CSS overrides
- Multi-platform-hub using the unified `@flamingo/ui-kit` design system
- No shared design tokens or components between the two

**Solution Implemented**: Complete clean slate rebuild with direct ui-kit integration ensures 100% design consistency.

---

## Project Overview
Create a new React application at `openframe/services/openframe-frontend/` to replace the existing Vue.js frontend (`openframe-ui`), leveraging the established `@flamingo/ui-kit` component library and maintaining full compatibility with the existing Spring Boot backend.

## Phase 1: Project Setup & Infrastructure

### 1.1 Create New React Application
- **Location**: `openframe/services/openframe-frontend/`
- **Setup**: Use Vite + React + TypeScript template for modern development
- **Add to .gitignore**: `openframe/services/openframe-frontend/` (as requested)

### 1.2 Core Dependencies & Architecture
```json
{
  "dependencies": {
    "@flamingo/ui-kit": "file:../openframe-frontend/ui-kit",
    "@apollo/client": "^3.8.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "zustand": "^4.4.0",
    "graphql": "^16.8.0",
    "@tanstack/react-query": "^4.0.0"
  }
}
```

### 1.3 Platform Configuration
- Set `REACT_APP_PLATFORM_TYPE=openframe` for ui-kit theming
- Configure Tailwind to extend ui-kit configuration
- Import ui-kit styles and design tokens

## Phase 2: Authentication & Core Infrastructure

### 2.1 Authentication System
**Convert Vue auth store to React:**
- `useAuthStore` (Pinia) → `useAuth` hook with Zustand
- Maintain HTTP-only cookie authentication flow
- Preserve existing OAuth2/OpenID Connect integration
- Keep `/oauth/me`, `/oauth/token`, `/oauth/logout` endpoints unchanged

### 2.2 Apollo Client Configuration
**Port existing GraphQL setup:**
- Maintain cookie-based authentication (no Authorization headers)
- Keep error handling and token refresh logic
- Convert Vue Apollo composables to React Apollo hooks

### 2.3 Router Setup
**Convert Vue Router to React Router:**
```
/login → LoginPage
/register → RegisterPage  
/oauth2/callback/google → OAuthCallbackPage
/dashboard → DashboardPage (SystemArchitecture.vue)
/devices → DevicesPage
/monitoring → MonitoringPage
/tools → ToolsPage
/mdm/* → MDM module pages
/rmm/* → RMM module pages  
/rac/* → RAC module pages
/settings → SettingsPage
/sso → SSOPage
/api-keys → ApiKeysPage
/profile → ProfilePage
```

## Phase 3: Component Migration Strategy

### 3.1 Authentication Pages ✅ **COMPLETED**
**High Priority - Critical Path:**
- ✅ `OpenFrameAuthPage` ← Complete authentication flow replacement
- ✅ **Multi-Platform-Hub Pattern**: Sections-based component architecture following about-page.tsx structure
- ✅ **URL Routing Integration**: Distinct URLs for each auth step (/auth, /auth/signup, /auth/login)
- ✅ **Navigation Utilities**: Custom useNavigation hook for consistent router usage

**✅ Implemented Architecture:**
- ✅ **Modular Component Structure**: Split into reusable sections following multi-platform-hub pattern
  - `AuthChoiceSection` - Organization creation and sign-in entry point
  - `AuthSignupSection` - Organization registration with user details
  - `AuthLoginSection` - SSO provider selection and authentication
  - `AuthBenefitsSection` - Shared benefits panel across all screens
- ✅ **Main Orchestrator**: `OpenFrameAuthPage` manages routing, state, and section composition
- ✅ **Navigation Integration**: Custom navigation utilities with proper URL synchronization
- ✅ **100% UI-Kit Integration**: All UI components use @flamingo/ui-kit design system

**✅ Implemented Features:**
- ✅ **URL Routing**: Browser history support with /auth, /auth/signup, /auth/login routes
- ✅ **State-URL Sync**: Navigation actions update both application state and browser URL
- ✅ **Shared Layout**: AuthBenefitsSection identical across all authentication screens
- ✅ **Dynamic Loading**: Button loading states with state-driven UI updates
- ✅ **OAuth2 Integration**: SSO provider authentication with AuthProvidersList component
- ✅ **Error Handling**: Toast-based error reporting using UI-Kit toast system
- ✅ **Back Navigation**: Proper back button functionality with URL updates

**🔧 Architecture Improvements:**
- **Multi-Platform-Hub Pattern**: Follows exact section-based structure from about-page.tsx
- **Navigation Utilities**: Centralized router functions in lib/navigation.ts
- **Component Reusability**: Each section is self-contained and reusable
- **State-Driven UI**: No `<form>` elements, only Button onClick handlers with dynamic loading
- **UI-Kit Compliance**: 100% design system consistency with OpenFrame theming

**📦 Component Structure:**
```typescript
// Main orchestrator following multi-platform-hub pattern
src/components/openframe/auth/
├── auth-page.tsx              # Main orchestrator (like about-page.tsx)
├── auth-choice-section.tsx    # Organization creation and sign-in
├── auth-signup-section.tsx    # User registration form
├── auth-login-section.tsx     # SSO provider selection
└── auth-benefits-section.tsx  # Shared benefits panel

// Navigation utilities
src/lib/navigation.ts          # Custom useNavigation hook and route constants

// Router integration
src/lib/router.tsx             # Added /auth/signup and /auth/login routes
```

**📊 Navigation Flow:**
```typescript
// Navigation utilities with proper URL updates
const { navigateTo, replace } = useNavigation()

// Route definitions
export const authRoutes = {
  choice: '/auth',
  signup: '/auth/signup', 
  login: '/auth/login',
  dashboard: '/dashboard'
}

// State + URL synchronization
const handleBack = () => {
  setStep('choice')
  navigateTo(authRoutes.choice)  // Updates both state and URL
}
```

### 3.2 Core Dashboard (Week 2)
**Main Application Shell:**
- `DashboardPage.tsx` ← `SystemArchitecture.vue`
- `Layout.tsx` ← `MainLayout.vue` + `SideNavigationLayout.vue`
- Navigation components using ui-kit

**Dashboard Features:**
- System architecture visualization
- Service status cards
- Integrated tools overview
- Real-time monitoring data

### 3.3 Device Management (Week 3)
**Device-related pages:**
- `DevicesPage.tsx` ← `DevicesView.vue`
- `UnifiedDeviceTable` component
- Device filtering and search
- Device details slider/modal

**Features to preserve:**
- Unified device model across MDM/RMM/RAC
- Device categorization and filtering
- Real-time status updates
- Bulk operations

### 3.4 Module Pages (Week 4-5)
**MDM Module:**
- `MDMLayout.tsx` ← `MDMLayout.vue`
- `MDMDashboard.tsx`, `MDMDevices.tsx`, etc.
- Settings with nested routing

**RMM Module:**
- `RMMLayout.tsx` ← `RMMLayout.vue`  
- Dashboard, devices, monitoring, scripts, events
- Bulk operations interface

**RAC Module:**
- `RACLayout.tsx` ← `RACLayout.vue`
- Remote connection and file transfer interfaces

## Phase 4: Advanced Features & Integration

### 4.1 Tool Integration (Week 6)
**Integrated Tools Management:**
- `ToolsPage.tsx` ← `Tools.vue`
- Tool connection status
- Configuration management
- Health monitoring

### 4.2 Settings & Configuration (Week 7)
**Settings Pages:**
- `SettingsPage.tsx` ← `SettingsView.vue`
- `SSOPage.tsx` ← `SSOView.vue` 
- `ApiKeysPage.tsx` ← `ApiKeys.vue`
- `ProfilePage.tsx` ← `Profile.vue`

### 4.3 Monitoring & Analytics (Week 8)
**Monitoring Infrastructure:**
- `MonitoringPage.tsx` ← `Monitoring.vue`
- Real-time metrics display
- Chart integration (Chart.js → React charts)
- Performance dashboards

## Phase 5: Data Layer & State Management

### 5.1 GraphQL Integration
**Convert Vue Apollo to React Apollo:**
- Port all existing GraphQL queries and mutations
- Maintain exact same query structure for backend compatibility
- Convert `useQuery`, `useMutation` patterns

### 5.2 State Management Migration
**Pinia → Zustand conversion:**
```typescript
// Vue Pinia store
export const useAuthStore = defineStore('auth', () => {...})

// React Zustand store  
export const useAuthStore = create<AuthState>((set, get) => ({...}))
```

### 5.3 Composables → Custom Hooks
**Convert Vue composables:**
- `useDevices.ts` → `useDevices.tsx`
- `useSettings.ts` → `useSettings.tsx` 
- `useScriptType.ts` → `useScriptType.tsx`

## Phase 6: UI Component Strategy

### 6.1 Leverage @flamingo/ui-kit
**Primary components from ui-kit:**
- Button, Card, Input, Modal, Table, Badge
- Form components (Input, Select, Checkbox, Switch)
- Navigation (Sidebar, Menu, Breadcrumb)
- Feedback (Toast, Alert, Progress)

### 6.2 Custom Components
**Convert Vue-specific components:**
- `DeviceDetailsSlider` → React modal/drawer
- `ModuleTable` → React data table
- `CommandDialog` → React command palette
- `ScriptEditor` → React Monaco integration

### 6.3 Chart Integration
**Convert Chart.js usage:**
- Vue Chart.js → React Chart.js or Recharts
- Maintain existing chart configurations
- Preserve data visualization patterns

## Phase 7: Testing & Quality Assurance

### 7.1 Testing Strategy
- **Unit Tests**: React Testing Library for components
- **Integration Tests**: Apollo Client mocking
- **E2E Tests**: Playwright for critical user journeys

### 7.2 Migration Validation
- Feature parity checklist with existing Vue app
- Performance benchmarking
- Accessibility audit
- Cross-browser testing

## Phase 8: Deployment & Migration

### 8.1 Build & Deploy Configuration
- Docker configuration similar to existing setup
- Environment variable management
- Production build optimization

### 8.2 Gradual Migration Strategy
1. Deploy React app alongside Vue app
2. Route specific pages to React app gradually
3. Monitor for issues and performance
4. Complete migration once stable
5. Deprecate Vue application

## Key Implementation Details

### Authentication Flow Preservation
```typescript
// Maintain exact same authentication pattern
const useAuth = () => {
  // HTTP-only cookies, same /oauth endpoints
  // No changes to backend authentication
}
```

### GraphQL Query Compatibility
```typescript
// Keep exact same queries for backend compatibility
const GET_DEVICES = gql`
  query GetDevices($filter: DeviceFilter) {
    devices(filter: $filter) {
      id
      name
      status
      # Same structure as Vue app
    }
  }
`;
```

### UI Kit Integration Example
```typescript
import { Button, Card, Modal } from '@flamingo/ui-kit/components/ui';
import '@flamingo/ui-kit/styles';

// Platform-aware theming automatically applied
const DeviceCard = () => (
  <Card className="device-card">
    <Button variant="primary">Manage Device</Button>
  </Card>
);
```

## Timeline & Milestones

**Week 1**: Authentication pages and core setup
**Week 2**: Dashboard and layout components  
**Week 3**: Device management functionality
**Week 4-5**: Module pages (MDM/RMM/RAC)
**Week 6**: Tool integration and monitoring
**Week 7**: Settings and configuration pages
**Week 8**: Testing, optimization, deployment prep

**Total Duration**: 8 weeks for complete feature parity

## Risk Mitigation

1. **Backend Compatibility**: No API changes required
2. **Authentication Security**: Maintain HTTP-only cookie flow
3. **Feature Parity**: Systematic component-by-component migration
4. **Performance**: Leverage React 18 and modern tooling
5. **Design Consistency**: Use established ui-kit components

## Success Criteria

- ✅ 100% feature parity with existing Vue application
- ✅ Same authentication and security model
- ✅ Improved performance and developer experience
- ✅ Consistent design using @flamingo/ui-kit
- ✅ Zero backend API changes required
- ✅ Comprehensive test coverage
- ✅ Successful production deployment