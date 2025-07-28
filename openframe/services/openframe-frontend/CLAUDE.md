# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenFrame React Frontend** - A modern React application built to replace the existing Vue.js frontend, leveraging the established `@flamingo/ui-kit` component library and maintaining full compatibility with the OpenFrame Spring Boot backend.

## Essential Commands

### Development Commands
```bash
npm run dev                                 # Start development server (port 4000)
npm run build                               # Build for production
npm run preview                             # Preview production build
npm run type-check                          # Run TypeScript type checking
```

### Backend Integration
- **Backend URL**: http://localhost:8080 (proxied via Vite)
- **GraphQL Endpoint**: http://localhost:8080/graphql
- **Authentication**: HTTP-only cookies (same as Vue app)

## Code Quality Standards

### TypeScript Policy: ZERO ERRORS TOLERANCE
- ❌ **NEVER commit code with TypeScript compilation errors**
- ❌ **NEVER ignore or suppress TypeScript errors with `@ts-ignore`**
- ✅ **ALWAYS fix TypeScript errors immediately**
- ✅ **ALWAYS run `npm run type-check` before considering work complete**

### Linting Policy: ZERO WARNINGS TOLERANCE  
- ❌ **NEVER commit code with linting warnings or errors**
- ❌ **NEVER disable linting rules without explicit justification**
- ✅ **ALWAYS fix all linting issues immediately**
- ✅ **ALWAYS follow established code formatting standards**

### Before Any Commit
```bash
# MANDATORY: All must pass with zero errors/warnings
npm run type-check                          # Must show "Found 0 errors"
npm run build                               # Must complete successfully
```

## Architecture Guidelines

### Component Development
- **Use @flamingo/ui-kit components** as primary building blocks
- **Import from**: `@flamingo/ui-kit/components/ui`
- **Platform theming**: Automatically set to `openframe`
- **Responsive design**: Mobile-first with Tailwind CSS classes

### Authentication Integration
- **Hook**: Use `useAuth` hook for all authentication needs
- **Route Protection**: Wrap with `<ProtectedRoute>` component
- **Backend Compatibility**: Maintains exact same HTTP-only cookie flow as Vue app
- **No API Changes**: Zero backend modifications required

### State Management
- **Authentication**: Zustand store (`useAuthStore`)
- **Data Fetching**: Apollo Client for GraphQL
- **Local State**: React hooks (useState, useReducer)
- **Global State**: Zustand stores (when needed)

## UI Kit Integration

### Component Usage
```typescript
import { Button, Card, Input, Modal } from '@flamingo/ui-kit/components/ui';
import '@flamingo/ui-kit/styles';

// Platform-aware theming automatically applied
const MyComponent = () => (
  <Card>
    <Input placeholder="Enter text" />
    <Button variant="primary">Submit</Button>
  </Card>
);
```

### Design System
- **ODS Tokens**: OpenFrame Design System automatically applied
- **Theme Provider**: Configured for `openframe` platform
- **Responsive**: Built-in responsive design patterns
- **Accessibility**: WCAG compliance built into ui-kit components

## API Integration Patterns

### GraphQL (Preferred)
```typescript
import { useQuery, useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';

const GET_DEVICES = gql`
  query GetDevices($filter: DeviceFilter) {
    devices(filter: $filter) {
      id
      name
      status
    }
  }
`;

const DevicesPage = () => {
  const { data, loading, error } = useQuery(GET_DEVICES);
  // Handle loading, error, and data states
};
```

### REST API (When Needed)
```typescript
// Automatic cookie-based authentication
const response = await fetch('/api/endpoint', {
  credentials: 'include' // Required for HTTP-only cookies
});
```

## Migration Strategy

### From Vue.js Components
1. **Identify equivalent**: Map Vue component to React equivalent
2. **Convert template**: JSX with proper TypeScript types
3. **Port logic**: Vue composables → React hooks
4. **Update state**: Pinia stores → Zustand stores
5. **Test thoroughly**: Ensure feature parity

### Page Migration Priority
1. ✅ **Authentication** (Login, Register, OAuth) - COMPLETE
2. 🚧 **Dashboard** (SystemArchitecture.vue → DashboardPage.tsx) - IN PROGRESS
3. 📋 **Device Management** (DevicesView.vue → DevicesPage.tsx) - PENDING
4. 📋 **Module Pages** (MDM, RMM, RAC) - PENDING
5. 📋 **Settings & Configuration** - PENDING

## Error Handling Standards

### Component Error Boundaries
```typescript
import { ErrorBoundary } from '@flamingo/ui-kit/components/features';

const MyPage = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <MyComponent />
  </ErrorBoundary>
);
```

### API Error Handling
```typescript
const { data, loading, error } = useQuery(QUERY);

if (loading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <DataComponent data={data} />;
```

## File Structure Standards

### Component Organization
```
src/
├── components/           # Shared React components
│   ├── ProtectedRoute.tsx
│   └── Layout.tsx
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication hook
│   └── useDevices.tsx   # Data fetching hooks
├── pages/               # Page components (one per route)
│   ├── LoginPage.tsx    
│   ├── DashboardPage.tsx
│   └── DevicesPage.tsx
├── lib/                 # Configuration and utilities
│   └── apollo-client.ts # GraphQL client setup
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

### Naming Conventions
- **Components**: PascalCase (`LoginPage.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.tsx`)
- **Types**: PascalCase interfaces (`interface User {}`)
- **Functions**: camelCase (`handleLogin`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

## Backend Compatibility Requirements

### CRITICAL: Maintain 100% Compatibility
- ✅ **Same authentication endpoints**: `/oauth/token`, `/oauth/me`, `/oauth/logout`
- ✅ **Same GraphQL schema**: No changes to queries/mutations
- ✅ **Same REST endpoints**: Identical API contracts
- ✅ **Same security model**: HTTP-only cookies only
- ❌ **NEVER change backend APIs** for frontend migration

### Authentication Flow (DO NOT MODIFY)
1. User authenticates via login or OAuth
2. Backend sets HTTP-only cookies (`access_token`, `refresh_token`)
3. All requests include cookies automatically
4. Token refresh handled by Apollo Client error links
5. Logout clears cookies via `/oauth/logout` endpoint

## Testing Standards

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import { LoginPage } from './LoginPage';

test('renders login form', () => {
  render(<LoginPage />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
```

### Integration Testing
- **Authentication flows**: Login, logout, token refresh
- **Protected routes**: Route access control
- **API integration**: GraphQL queries and mutations

## Performance Standards

### Bundle Optimization
- **Tree shaking**: Import only used ui-kit components
- **Code splitting**: Route-based lazy loading
- **Image optimization**: Proper image loading strategies
- **Caching**: Apollo Client cache configuration

### Loading States
```typescript
const MyComponent = () => {
  const { data, loading } = useQuery(QUERY);
  
  if (loading) return <Skeleton />;
  return <DataDisplay data={data} />;
};
```

## Troubleshooting Guide

### Common TypeScript Errors
1. **Module not found**: Check `package.json` dependencies
2. **JSX type errors**: Ensure `@types/react` is installed
3. **UI Kit imports**: Verify `@flamingo/ui-kit` path aliases

### Common Development Issues
1. **Backend connection**: Ensure Spring Boot backend running on port 8080
2. **Authentication**: Check browser cookies in DevTools
3. **CORS issues**: Verify Vite proxy configuration
4. **UI Kit styling**: Ensure `@flamingo/ui-kit/styles` is imported

### Debug Commands
```bash
# Check TypeScript compilation
npm run type-check

# Build and check for errors
npm run build

# Inspect bundle
npm run preview
```

## Development Workflow

### Daily Development
1. **Start backend**: Ensure OpenFrame backend running
2. **Start frontend**: `npm run dev`
3. **Check types**: `npm run type-check` (frequently)
4. **Test changes**: Manual testing + automated tests
5. **Verify build**: `npm run build` before commits

### Code Review Checklist
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] Zero linting warnings/errors
- [ ] Successful build (`npm run build`)
- [ ] UI Kit components used appropriately
- [ ] Authentication flows working
- [ ] Backend compatibility maintained
- [ ] Responsive design implemented
- [ ] Error handling implemented
- [ ] Loading states implemented

## Important Notes

### DO NOT
- ❌ Modify backend APIs or authentication
- ❌ Change HTTP-only cookie implementation
- ❌ Ignore TypeScript or linting errors
- ❌ Use non-ui-kit components without justification
- ❌ Break responsive design patterns

### ALWAYS
- ✅ Use established ui-kit components
- ✅ Maintain backend API compatibility
- ✅ Fix all TypeScript errors immediately
- ✅ Test authentication flows thoroughly
- ✅ Follow established patterns and conventions
- ✅ Run type-check before considering work complete

## Support and Resources

- **UI Kit Documentation**: `./ui-kit/CLAUDE.md`
- **Main Project Documentation**: `../../CLAUDE.md`
- **Backend API Documentation**: Check Spring Boot services
- **Design Tokens**: Available in ui-kit styles

Remember: This React frontend is a drop-in replacement for the Vue.js app with ZERO backend changes required. Maintain this compatibility at all costs.