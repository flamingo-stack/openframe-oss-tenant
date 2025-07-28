# OpenFrame React Frontend

A modern React application built to replace the existing Vue.js frontend, leveraging the established `@flamingo/ui-kit` component library and maintaining full compatibility with the OpenFrame Spring Boot backend.

## Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: @flamingo/ui-kit (located in `./ui-kit/`)
- **Styling**: Tailwind CSS with ODS (OpenFrame Design System)
- **State Management**: Zustand for authentication, React Query for data fetching
- **Routing**: React Router 6
- **GraphQL**: Apollo Client with cookie-based authentication
- **Authentication**: HTTP-only cookies (same as Vue app)

## Project Structure

```
openframe-frontend/
├── ui-kit/                     # @flamingo/ui-kit component library
├── src/
│   ├── components/             # React components
│   │   └── ProtectedRoute.tsx  # Route protection
│   ├── hooks/                  # Custom React hooks
│   │   └── useAuth.tsx         # Authentication hook
│   ├── lib/                    # Configuration and utilities
│   │   └── apollo-client.ts    # GraphQL client setup
│   ├── pages/                  # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── ...
│   ├── stores/                 # Global state management
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- OpenFrame backend running on `http://localhost:8080`

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd openframe/services/openframe-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` if needed to match your backend configuration:
   ```bash
   VITE_API_URL=http://localhost:8080
   VITE_CLIENT_ID=openframe-ui
   VITE_CLIENT_SECRET=openframe-ui-secret
   VITE_PLATFORM_TYPE=openframe
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser to:**
   ```
   http://localhost:3000
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run type-check` - Run TypeScript type checking

## Authentication

The application uses the same authentication flow as the existing Vue.js app:

- **HTTP-only cookies** for secure token storage
- **OAuth2/OpenID Connect** support
- **Automatic token refresh** on API calls
- **Same backend endpoints**: `/oauth/token`, `/oauth/me`, `/oauth/logout`

### Authentication Flow

1. User logs in via `/login` or OAuth provider
2. Backend sets HTTP-only cookies (`access_token`, `refresh_token`)
3. All API requests include cookies automatically
4. Apollo Client handles token refresh on 401 errors
5. User state managed by Zustand store

## UI Components

The app leverages the `@flamingo/ui-kit` located in `./ui-kit/`:

```tsx
import { Button, Card, Input } from '@flamingo/ui-kit/components/ui';
import '@flamingo/ui-kit/styles';

// Platform-aware theming automatically applied for OpenFrame
const MyComponent = () => (
  <Card>
    <Input placeholder="Enter text" />
    <Button variant="primary">Submit</Button>
  </Card>
);
```

### Design System Integration

- **Platform Type**: Automatically set to `openframe`
- **Theme**: ODS (OpenFrame Design System) tokens
- **Components**: Radix UI primitives with custom styling
- **Responsive**: Mobile-first responsive design

## API Integration

### GraphQL (Apollo Client)

```tsx
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

const DevicesList = () => {
  const { data, loading, error } = useQuery(GET_DEVICES);
  // Component logic...
};
```

### REST API

Apollo Client handles REST endpoints through the same cookie-based authentication:

```tsx
// Automatic cookie inclusion and error handling
const response = await fetch('/api/some-endpoint', {
  credentials: 'include'
});
```

## Backend Compatibility

The React app maintains **100% compatibility** with the existing Spring Boot backend:

- ✅ Same authentication endpoints and flow
- ✅ Same GraphQL schema and queries  
- ✅ Same REST API contracts
- ✅ Same HTTP-only cookie security model
- ✅ Same OAuth2 configuration

**No backend changes required** for the migration.

## Migration from Vue.js

This React app provides feature parity with the existing Vue.js application:

| Vue.js Component | React Component | Status |
|------------------|-----------------|---------|
| `Login.vue` | `LoginPage.tsx` | ✅ Complete |
| `Register.vue` | `RegisterPage.tsx` | ✅ Complete |
| `SystemArchitecture.vue` | `DashboardPage.tsx` | ✅ Basic structure |
| `DevicesView.vue` | `DevicesPage.tsx` | 🚧 Placeholder |
| `Monitoring.vue` | `MonitoringPage.tsx` | 🚧 Placeholder |
| Other pages... | | 🚧 In progress |

### Key Differences

- **State Management**: Pinia → Zustand
- **Routing**: Vue Router → React Router
- **Components**: PrimeVue → @flamingo/ui-kit
- **Composables**: Vue composables → React hooks

## Development Guidelines

### Component Development

1. **Use UI Kit components** as primary building blocks
2. **Follow TypeScript strict mode** for type safety
3. **Implement responsive design** using Tailwind classes
4. **Handle loading and error states** appropriately

### Authentication

1. **Use `useAuth` hook** for authentication state
2. **Wrap protected routes** with `<ProtectedRoute>`
3. **Handle auth errors** gracefully with automatic retry

### Code Style

1. **Functional components** with hooks
2. **TypeScript interfaces** for all props and data
3. **Consistent naming** following React conventions
4. **Error boundaries** for robust error handling

## Deployment

The application builds to static files that can be served by any web server:

```bash
npm run build
```

Output in `dist/` directory includes:
- Optimized JavaScript bundles
- CSS with design system tokens
- Source maps for debugging
- Static assets

## Troubleshooting

### Common Issues

1. **UI Kit not found**: Ensure `./ui-kit/` directory exists
2. **Backend connection**: Verify backend is running on port 8080
3. **Authentication issues**: Check cookie settings and CORS configuration
4. **Build errors**: Run `npm run type-check` to identify TypeScript issues

### Development Tips

- Use browser DevTools to inspect HTTP-only cookies
- Check Network tab for API call authentication
- Apollo Client DevTools for GraphQL debugging
- React DevTools for component state inspection

## Next Steps

1. **Complete page migrations** from Vue.js components
2. **Implement device management** functionality
3. **Add module pages** (MDM, RMM, RAC)
4. **Integrate monitoring** and analytics
5. **Add comprehensive testing** suite

## Contributing

When contributing to this React frontend:

1. Maintain backward compatibility with existing backend
2. Use established UI Kit components consistently
3. Follow the authentication patterns established
4. Test across different browsers and devices
5. Update documentation for any new features