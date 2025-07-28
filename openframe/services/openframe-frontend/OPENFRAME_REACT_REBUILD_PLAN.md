# OpenFrame React Webapp Rebuild Plan

## Project Overview
Create a new React application at `openframe/services/openframe-webapp/` to replace the existing Vue.js frontend (`openframe-ui`), leveraging the established `@flamingo/ui-kit` component library and maintaining full compatibility with the existing Spring Boot backend.

## Phase 1: Project Setup & Infrastructure

### 1.1 Create New React Application
- **Location**: `openframe/services/openframe-webapp/`
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

### 3.1 Authentication Pages (Week 1)
**High Priority - Critical Path:**
- `LoginPage.tsx` ← `Login.vue`
- `RegisterPage.tsx` ← `Register.vue`
- `OAuthCallbackPage.tsx` ← `OAuthCallback.vue`

**Key Features:**
- OAuth2 integration with Google
- Form validation
- Error handling
- Redirect logic

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