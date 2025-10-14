# OpenFrame Frontend

A pure React client-side application with multi-platform architecture serving as the web interface for the OpenFrame platform.

## Overview

OpenFrame Frontend is a modern Next.js application built with React 18, TypeScript, and a multi-platform architecture inspired by multi-platform-hub. It provides two distinct apps within a single codebase:

- **OpenFrame-Auth**: Authentication and organization setup (`/auth/*`)
- **OpenFrame-Dashboard**: Main application interface (`/dashboard`, `/devices`, `/settings`)

This pure client-side application provides a responsive, user-friendly interface for managing devices, monitoring systems, and configuring the OpenFrame platform.

## Key Features

- **Pure Client-Side Architecture**: No server-side rendering, optimized for performance
- **UI-Kit Design System**: 100% component consistency using @flamingo/ui-kit
- **Fleet MDM Integration**: Comprehensive device monitoring with Fleet MDM data
- **Multi-Tool Support**: Unified data from Fleet MDM, Tactical RMM, and GraphQL
- **GraphQL Integration**: Seamless communication with OpenFrame API
- **Real-time Updates**: WebSocket support for live data
- **OAuth/SSO Support**: Integration with Google, Microsoft, and other providers
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **ODS Design System**: WCAG 2.1 AA compliant color tokens and theming

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

- **Framework**: Next.js 15 with React 19 and TypeScript 5.8
- **Build Tool**: Next.js (pure client-side export)
- **Routing**: Next.js App Router (file-based routing)
- **State Management**: Zustand 5.0.8
- **API Client**: Apollo Client 3.8 (GraphQL)
- **UI Components**: @flamingo/ui-kit (external unified library - see below)
- **Styling**: Tailwind CSS 3.4 + ODS design tokens
- **Authentication**: JWT with HTTP-only cookies
- **Terminal**: xterm.js 5.3 for device terminal access

### UI-Kit: External Unified Library

**IMPORTANT:** `@flamingo/ui-kit` is an **external, standalone design system library** maintained separately from OpenFrame. It is:

- **Repository**: Separate git repository at `/Users/michaelassraf/Documents/GitHub/ui-kit`
- **Connection**: Symlinked to this project at `./ui-kit` for development convenience
- **Purpose**: Shared across multiple Flamingo Stack projects (OpenFrame, Flamingo, TMCG)
- **Components**: 328+ production-ready UI components
- **Theming**: ODS (Open Design System) color tokens with multi-app support
- **Updates**: Changes to ui-kit affect all projects that depend on it

**Symlink Structure:**
```bash
openframe-frontend/ui-kit -> ../../../../ui-kit  # Symlink to external repo
```

**Why Symlink?**
- Enables immediate testing of ui-kit changes in OpenFrame context
- Avoids npm publish/install cycle during development
- Maintains single source of truth for design system
- Ensures consistency across all Flamingo Stack applications

**Production Deployment:**
- ui-kit is published as `@flamingo/ui-kit` npm package
- OpenFrame installs it as a regular dependency
- Symlink is only for local development convenience

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

## Fleet MDM Integration

OpenFrame features comprehensive Fleet MDM integration for device monitoring and management.

### Features

- **Complete Type System**: Full TypeScript types for Fleet MDM API (`fleet.types.ts`)
- **Data Normalization**: Unified data from Fleet MDM, Tactical RMM, and GraphQL with proper prioritization
- **Hardware Monitoring**: CPU cores, disk usage, RAM, and battery health (macOS)
- **Network Information**: Unified IP addresses with private/public filtering
- **User Management**: Unified user display across Fleet and Tactical sources
- **ODS Design Tokens**: All components use Open Design System color tokens

### Data Prioritization Strategy

```
Core Hardware/System:  Fleet MDM → GraphQL → Tactical RMM
Agent Version:         GraphQL → Tactical RMM → Fleet MDM
IP Addresses:          Unified array with Fleet IPs prioritized first
Users:                 Unified type (Fleet users + Tactical logged_username)
Public IP:             Filtered to exclude private IPs (10.x, 192.168.x, etc.)
```

### Hardware Tab Components

```typescript
// Battery Health (macOS devices)
- Cycle count display
- Health status with smart parsing ("Normal (99%)" → 99%)
- Inverted progress bar (high % = green/good, low % = red/bad)
- Thresholds: >80% green, 60-80% yellow, <60% red

// CPU Information
- Physical cores and logical cores from Fleet
- Normalized CPU model names (e.g., "Apple M3 Max")
- CPU type information

// Disk Information
- Physical disk grouping with partition details
- Usage percentages with visual progress bars
- Capacity and free space information

// RAM Information
- Total memory from Fleet (converted from bytes to GB)
```

### Inverted Progress Bar

The progress bar component supports two semantic modes:

**Normal Mode (inverted=false)** - For usage metrics
```typescript
// Disk usage: high values = bad (red), low values = good (green)
<ProgressBar progress={diskUsage} inverted={false} />
```

**Inverted Mode (inverted=true)** - For health metrics
```typescript
// Battery health: high values = good (green), low values = bad (red)
<ProgressBar progress={batteryHealth} inverted={true} />
```

### ODS Color Tokens

All components use ODS design tokens instead of hardcoded colors:

```typescript
// Success (Green)
--ods-attention-green-success: #5ea62e

// Error (Red)
--ods-attention-red-error: #f36666

// Warning (Yellow/Amber)
--color-warning: #f59e0b

// Unfilled segments (Gray)
--ods-system-greys-soft-grey-action: #4e4e4e
```

### Documentation

See [FLEET_MDM_INTEGRATION.md](./FLEET_MDM_INTEGRATION.md) for complete implementation details.

## MANDATORY Development Patterns

### API Calls Pattern: use... Hooks + useToast
ALL API operations MUST follow this pattern:

```typescript
import { useToast } from '@flamingo/ui-kit/hooks'

// MANDATORY: All API calls must be in use... hooks
export function useDevices() {
  const { toast } = useToast() // ← REQUIRED in every API hook
  
  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      const data = await response.json()
      return data
    } catch (error) {
      toast({
        title: "Fetch Failed",
        description: "Unable to load devices",
        variant: "destructive"
      })
      throw error
    }
  }
  
  const createDevice = async (deviceData) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        body: JSON.stringify(deviceData)
      })
      toast({
        title: "Success!",
        description: "Device created successfully",
        variant: "success"
      })
      return await response.json()
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Unable to create device",
        variant: "destructive"
      })
      throw error
    }
  }
  
  return { fetchDevices, createDevice }
}
```

### Rules:
1. **ALL API calls** must be in custom hooks with `use...` naming
2. **EVERY API hook** must include `const { toast } = useToast()`
3. **ERROR handling** must use toast notifications (never custom error divs)
4. **SUCCESS operations** should show success toasts

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
4. **MANDATORY**: ALL API calls must be in `use...` hooks with `useToast`
5. Test your changes thoroughly
6. Follow the established patterns

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

- [CLAUDE.md](./CLAUDE.md) - AI assistant guidelines and development patterns
- [FLEET_MDM_INTEGRATION.md](./FLEET_MDM_INTEGRATION.md) - Fleet MDM integration details
- [UI-Kit README](./ui-kit/README.md) - External design system documentation (symlinked)
- [Main OpenFrame Docs](../../../docs/README.md) - Platform documentation