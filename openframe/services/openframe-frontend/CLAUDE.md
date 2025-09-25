# OpenFrame Frontend - Claude Development Guide

**Next.js 15 + React 19 + TypeScript 5.8 + @flamingo/ui-kit (328+ components)**

> Comprehensive instructions for Claude when working with the OpenFrame Frontend service.

## Core Principles

**MANDATORY REQUIREMENTS:**
1. ALL UI components MUST use @flamingo/ui-kit (328+ components available)
2. ALL API operations MUST use `useToast` hook for feedback
3. ALL styling MUST use ODS design tokens (no hardcoded values)
4. Follow WCAG 2.1 AA accessibility standards
5. Use state-driven interactions (NOT traditional forms)

## Quick Navigation

- [Setup & Commands](#setup--commands)
- [Architecture & Structure](#architecture--structure)
- [UI-Kit Integration](#ui-kit-integration)
- [Development Patterns](#development-patterns)
- [Testing & Deployment](#testing--deployment)
- [Troubleshooting](#troubleshooting)

## Setup & Commands

### Quick Setup
```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost/api" >> .env.local
echo "NEXT_PUBLIC_CLIENT_ID=openframe_web_dashboard" >> .env.local
echo "NEXT_PUBLIC_CLIENT_SECRET=prod_secret" >> .env.local
npm run dev
```
Access: http://localhost:3000

### Essential Commands
| Command | Purpose |
|---------|----------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript validation |
| `npm run lint` | Code quality check |

### Environment Variables
```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_CLIENT_ID=openframe_web_dashboard
NEXT_PUBLIC_CLIENT_SECRET=prod_secret

# Optional
NEXT_PUBLIC_APP_MODE=full-app  # or auth-only
NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER=true
```

## Architecture & Structure

### Technology Stack
- **Next.js 15** - App Router, SSG/SSR
- **React 19** - UI library with new features
- **TypeScript 5.8** - Type safety
- **Zustand 5.0.8** - State management
- **Apollo Client 3.8** - GraphQL
- **@flamingo/ui-kit** - Design system (328+ components)
- **Tailwind CSS 3.4** - Styling with ODS tokens
- **xterm.js 5.3** - Terminal interface

### Application Modules
- **Authentication** - Multi-provider SSO, organization setup
- **Dashboard** - System overview, real-time metrics
- **Device Management** - Monitoring, terminal access, actions
- **Log Analysis** - Streaming, search, filtering, export
- **Mingo Query Interface** - MongoDB-like query builder

### Project Structure
```
src/
├── app/                 # Next.js App Router
│   ├── auth/           # Authentication module
│   ├── dashboard/      # Main dashboard
│   ├── devices/        # Device management
│   ├── logs-page/      # Log analysis
│   ├── mingo/          # Query interface
│   └── components/     # Shared components
├── stores/             # Zustand state stores
├── lib/                # Utilities & config
ui-kit/                 # Design system (symlink)
```

## UI-Kit Integration

### Core Import Pattern
```typescript
// ALWAYS import styles first
import '@flamingo/ui-kit/styles'

// Core UI components
import {
  Button, Card, CardHeader, CardContent, CardFooter,
  Input, Textarea, Label, Checkbox, Switch,
  Badge, Alert, AlertDescription,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
  Tabs, TabsList, TabsTrigger, TabsContent,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  ContentLoader, Separator, Avatar, Progress, Table
} from '@flamingo/ui-kit/components/ui'

// Feature components
import {
  AuthProvidersList, AuthTrigger, ProviderButton,
  Terminal
} from '@flamingo/ui-kit/components/features'

// MANDATORY hooks
import {
  useToast,        // REQUIRED for all API operations
  useDebounce,
  useLocalStorage,
  useTerminal
} from '@flamingo/ui-kit/hooks'

// Utilities
import {
  cn,                      // Tailwind class merging
  getPlatformAccentColor,  // Platform colors
  getProxiedImageUrl      // Safe image loading
} from '@flamingo/ui-kit/utils'
```

### Component Categories
- **Core UI (50+)** - Button, Card, Input, Dialog, Tabs, etc.
- **Feature Components** - Auth, Terminal, specialized business logic
- **Platform-Specific** - OpenFrame system admin components

## Development Patterns

### MANDATORY: API Hook Pattern with Toast
```typescript
import { useToast } from '@flamingo/ui-kit/hooks'

export function useDevices() {
  const { toast } = useToast() // REQUIRED for all API hooks

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      const data = await response.json()

      // SUCCESS feedback - REQUIRED
      toast({
        title: "Success",
        description: "Devices loaded successfully",
        variant: "success",
        duration: 3000
      })

      return data
    } catch (error) {
      // ERROR feedback - REQUIRED
      toast({
        title: "Fetch Failed",
        description: error.message || "Unable to load devices",
        variant: "destructive",
        duration: 5000
      })
      throw error
    }
  }

  const executeAction = async (deviceId: string, action: string) => {
    try {
      // Loading feedback
      toast({
        title: "Processing...",
        description: `Executing ${action} on device ${deviceId}`,
        variant: "info",
        duration: 2000
      })

      const response = await fetch(`/api/devices/${deviceId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      // Success feedback
      toast({
        title: "Action Executed",
        description: `${action} completed successfully`,
        variant: "success",
        duration: 4000
      })

      return await response.json()
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error.message || `Unable to execute ${action}`,
        variant: "destructive",
        duration: 6000
      })
      throw error
    }
  }

  return { fetchDevices, executeAction }
}
```

### State Management with Zustand
```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface DevicesState {
  devices: Device[]
  selectedDevice: Device | null
  loading: boolean
  setDevices: (devices: Device[]) => void
  selectDevice: (device: Device | null) => void
}

export const useDevicesStore = create<DevicesState>()(
  devtools(
    persist(
      immer((set) => ({
        devices: [],
        selectedDevice: null,
        loading: false,

        setDevices: (devices) => set(state => { state.devices = devices }),
        selectDevice: (device) => set(state => { state.selectedDevice = device })
      })),
      { name: 'devices-store' }
    ),
    { name: 'devices-store' }
  )
)
```

### State-Driven Form Pattern
```typescript
export function DeviceConfigPanel({ deviceId }: { deviceId: string }) {
  const [name, setName] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const handleSave = async () => {
    setIsUpdating(true)
    try {
      await updateDevice(deviceId, { name })
      toast({
        title: "Settings Saved",
        description: "Device configuration updated successfully",
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error.message || "Unable to save configuration",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2>Device Configuration</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="device-name">Device Name</Label>
          <Input
            id="device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter device name"
            disabled={isUpdating}
          />
        </div>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

## Accessibility Standards

### Required Practices
1. **Semantic HTML** - Use proper HTML elements and UI-Kit components
2. **Keyboard Navigation** - UI-Kit provides automatic support
3. **Screen Reader Support** - Add aria-labels and descriptions
4. **Color/Contrast** - Use ODS design tokens only
5. **Focus Management** - Handle focus in modals and dynamic content

### ODS Design Tokens (MANDATORY)
```typescript
// ✅ GOOD: Using ODS tokens
<Card className="bg-ods-card border-ods-border">
  <div className="text-ods-text-primary">Primary text</div>
  <div className="text-ods-text-secondary">Secondary text</div>
  <Button className="bg-ods-accent text-ods-text-on-accent">
    Action
  </Button>
</Card>

// ❌ BAD: Hardcoded values
<Card className="bg-gray-800 border-gray-700">
  <div className="text-white">Primary text</div>
</Card>
```

## Testing & Deployment

### Development Testing
| Command | Purpose |
|---------|---------|
| `npm run type-check` | TypeScript validation |
| `npm run lint` | Code quality check |
| `npm run build` | Production build verification |

### Build & Deployment
```bash
# Full application build
npm run build

# Auth-only build (minimal)
npm run build:auth

# Output: dist/ directory (static export)
```

**Deployment Targets:**
- Static hosting (Vercel, Netlify, AWS S3)
- Container deployment with nginx
- CDN distribution

## Troubleshooting

### Common Issues
**Port Conflicts:**
```bash
lsof -i:3000                    # Check port usage
lsof -ti:3000 | xargs kill -9   # Kill processes
PORT=3001 npm run dev           # Use different port
```

**UI-Kit Issues:**
```bash
cd ui-kit && npm install       # Reinstall dependencies
cd ui-kit && npm run type-check # Verify build
```

**API Connection:**
- Verify `NEXT_PUBLIC_API_URL` matches backend
- Check CORS configuration
- Verify `CLIENT_ID` and `CLIENT_SECRET`

**State Management:**
```javascript
// Clear corrupted localStorage
localStorage.removeItem('devices-store')
localStorage.removeItem('auth-store')
```

### Performance Optimization
- Use React.memo for expensive components
- Implement proper loading states
- Optimize bundle size with dynamic imports
- Use GraphQL query caching
- Implement code splitting at route level

## Development Workflow

1. **Install dependencies**: `npm install`
2. **Configure environment**: Set API URL and credentials
3. **Start development**: `npm run dev`
4. **Follow patterns**: Use UI-Kit components and API hooks with toast
5. **Test thoroughly**: Type-check, lint, manual testing
6. **Build and deploy**: Verify production build works

## Key Integration Points

### Backend Services
- **API Gateway** - `/api` - Primary API access
- **GraphQL** - `/api/graphql` - Real-time queries
- **WebSocket** - `/api/ws` - Live updates
- **Authentication** - `/api/oauth/*` - OAuth2/OpenID Connect

### External Dependencies
- **UI-Kit** - Local symlink with OpenFrame theming
- **Terminal Libraries** - xterm.js integration
- **Query Libraries** - Apollo + TanStack for GraphQL + REST

---

**Remember: Always use UI-Kit components and follow the mandatory useToast pattern for all API operations!**