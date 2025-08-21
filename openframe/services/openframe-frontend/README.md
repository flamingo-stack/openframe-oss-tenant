# OpenFrame Frontend

A pure React client-side application serving as the web interface for the OpenFrame platform.

## Overview

OpenFrame Frontend is a modern single-page application (SPA) built with React 18, TypeScript, and Vite. It provides a responsive, user-friendly interface for managing devices, monitoring systems, and configuring the OpenFrame platform.

## Key Features

- **Pure Client-Side Architecture**: No server-side rendering, optimized for performance
- **UI-Kit Design System**: 100% component consistency using @flamingo/ui-kit
- **GraphQL Integration**: Seamless communication with OpenFrame API
- **Real-time Updates**: WebSocket support for live data
- **OAuth/SSO Support**: Integration with Google, Microsoft, and other providers
- **Responsive Design**: Mobile-first approach with adaptive layouts

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Access to OpenFrame backend services
- Modern web browser

### Development Setup

```bash
# Clone the repository
git clone https://github.com/openframe/openframe.git
cd openframe/openframe/services/openframe-frontend

# Install dependencies
npm install

# Configure API endpoint (IMPORTANT!)
# For Kubernetes cluster:
export VITE_API_URL=http://localhost/api
export VITE_CLIENT_ID=openframe_web_dashboard
export VITE_CLIENT_SECRET=prod_secret

# Or create .env.local file:
cat > .env.local << EOF
VITE_API_URL=http://localhost/api
VITE_CLIENT_ID=openframe_web_dashboard
VITE_CLIENT_SECRET=prod_secret
EOF

# Start development server (default port: 4000)
npm run dev

# Or start in background (recommended):
nohup npm run dev > dev.log 2>&1 &

# Open in browser
open http://localhost:4000
```

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Architecture

### Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (lightning-fast HMR)
- **Routing**: React Router v6
- **State Management**: Zustand
- **API Client**: Apollo Client (GraphQL)
- **UI Components**: @flamingo/ui-kit
- **Styling**: Tailwind CSS + UI-Kit design tokens
- **Authentication**: JWT with HTTP-only cookies

### Project Structure

```
openframe-frontend/
├── src/
│   ├── components/     # Business logic components
│   │   └── openframe/  # OpenFrame-specific components
│   │       └── auth/   # Authentication flow sections
│   ├── pages/         # Route components
│   ├── hooks/         # Custom React hooks
│   ├── stores/        # State management
│   ├── services/      # API services
│   ├── lib/           # Utilities and configurations
│   │   ├── navigation.ts  # Navigation utilities
│   │   └── router.tsx     # React Router configuration
│   └── types/         # TypeScript definitions
├── ui-kit/            # UI component library
├── multi-platform-hub/   # Reference patterns (read-only)
├── public/            # Static assets
└── vite.config.ts     # Vite configuration
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript compiler
npm run lint         # Run ESLint
npm run test         # Run tests
```

### Environment Variables

Create a `.env.local` file for local development:

```env
# For Kubernetes cluster (recommended)
VITE_API_URL=http://localhost/api
VITE_GRAPHQL_ENDPOINT=http://localhost/api/graphql
VITE_WS_ENDPOINT=ws://localhost/api/ws
VITE_CLIENT_ID=openframe_web_dashboard
VITE_CLIENT_SECRET=prod_secret
VITE_APP_TYPE=openframe

# For local debug gateway (alternative)
# VITE_API_URL=http://localhost:8100/api
# VITE_GRAPHQL_ENDPOINT=http://localhost:8100/api/graphql
# VITE_WS_ENDPOINT=ws://localhost:8100/api/ws
```

### Debugging

For debugging sessions, follow these steps:

1. **Kill any existing processes on port 4000**:
   ```bash
   lsof -ti:4000 | xargs kill -9 2>/dev/null || true
   ```

2. **Set correct API URL and start the development server**:
   ```bash
   # Set environment variables
   export VITE_API_URL=http://localhost/api
   export VITE_CLIENT_ID=openframe_web_dashboard
   export VITE_CLIENT_SECRET=prod_secret
   
   # Start in background
   nohup npm run dev > dev.log 2>&1 &
   ```

3. **Monitor logs and check for issues**:
   ```bash
   # Monitor dev server logs
   tail -f dev.log
   
   # Check browser console
   # Open http://localhost:4000 and check DevTools console
   ```

See [CLAUDE.md](./CLAUDE.md) for detailed debugging instructions.

## UI Components

All UI components come from the @flamingo/ui-kit design system. Custom UI components are not allowed - only business logic components that wrap UI-Kit components.

### Example Usage

```typescript
import { Button, Card } from '@flamingo/ui-kit/components/ui'
import { AuthProvidersList } from '@flamingo/ui-kit/components/features'

function MyComponent() {
  return (
    <Card>
      <h2>Welcome to OpenFrame</h2>
      <Button variant="primary">Get Started</Button>
    </Card>
  )
}
```

## API Integration

The frontend communicates with the OpenFrame backend through GraphQL:

```typescript
import { useQuery } from '@apollo/client'
import { GET_DEVICES } from './queries'

function DevicesPage() {
  const { data, loading, error } = useQuery(GET_DEVICES)
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <DeviceList devices={data.devices} />
}
```

## Authentication

OpenFrame uses JWT tokens stored in HTTP-only cookies for security:

- OAuth/SSO providers: Google, Microsoft, GitHub
- Session management through secure cookies
- Automatic token refresh
- Protected routes with authentication guards

### Authentication Component Architecture

The authentication flow uses a modular, sections-based architecture following the multi-platform-hub pattern:

```typescript
// Main authentication page with URL routing
/auth          → AuthChoiceSection (organization setup)
/auth/signup   → AuthSignupSection (user registration)
/auth/login    → AuthLoginSection (SSO provider selection)
```

**Component Structure:**
- `OpenFrameAuthPage` - Main orchestrator managing state and routing
- `AuthChoiceSection` - Organization creation and sign-in entry point
- `AuthSignupSection` - User registration with organization details
- `AuthLoginSection` - SSO provider selection and authentication
- `AuthBenefitsSection` - Shared benefits panel across all screens

**Navigation Integration:**
```typescript
import { useNavigation, authRoutes } from '@/lib/navigation'

const { navigateTo, replace } = useNavigation()
navigateTo(authRoutes.signup) // Proper URL updates with browser history
```

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Browser Automation

OpenFrame Frontend supports browser automation through Browser MCP for testing and development:

- Automated UI testing
- Visual regression testing
- Development workflow automation
- See [CLAUDE.md](./CLAUDE.md#browser-automation-with-browser-mcp) for setup

## Contributing

1. Follow the UI-Kit design system strictly
2. Write TypeScript for all new code
3. Use functional components with hooks
4. Test your changes thoroughly
5. Follow the established patterns

## Deployment

The frontend can be deployed to any static hosting service:

```bash
# Build for production
npm run build

# Deploy dist/ folder to your hosting service
# Examples: Vercel, Netlify, AWS S3, Nginx
```

## Troubleshooting

### Common Issues

- **Port 4000 in use**: Kill the process using `lsof -ti:4000 | xargs kill -9`
- **UI-Kit import errors**: Run `cd ui-kit && npm install`
- **API connection issues**: 
  - Ensure you're using the correct API URL: `http://localhost/api` for K8s cluster
  - Check that the backend services are running in your Kubernetes cluster
  - Verify CORS is properly configured on the gateway
- **Authentication errors**: 
  - Verify `VITE_CLIENT_ID` and `VITE_CLIENT_SECRET` match backend configuration
  - Check cookie settings and CORS configuration
  - Ensure OAuth2 endpoints are accessible at `/api/oauth/*`
- **Background process hanging**: Use `nohup npm run dev > dev.log 2>&1 &` instead of `npm run dev &`

### Getting Help

- Check [CLAUDE.md](./CLAUDE.md) for detailed development guidelines
- Review the main [OpenFrame documentation](../../../docs/README.md)
- Inspect browser console for client-side errors
- Check network tab for API issues

## License

See the main OpenFrame repository for license information.

## Related Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines
- [UI-Kit README](./ui-kit/README.md) - Component library documentation
- [Main OpenFrame Docs](../../../docs/README.md) - Platform documentation