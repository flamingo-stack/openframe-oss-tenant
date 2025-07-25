# OpenFrame Frontend

Modern React frontend for the OpenFrame platform built with TypeScript, Tailwind CSS, and cookie-based authentication.

## 🚀 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand
- **Data Fetching**: TanStack Query + GraphQL
- **Routing**: React Router 6
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + Testing Library
- **Authentication**: Cookie-based (HTTP-only cookies)

## 📁 Project Structure

```
src/
├── api/                # API clients (REST & GraphQL)
├── components/         
│   ├── auth/          # Authentication components
│   ├── shared/        # Reusable components
│   └── ui/            # UI primitives
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── pages/             # Page components
├── stores/            # Zustand stores
├── types/             # TypeScript types
└── utils/             # Helper functions
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Spring backend running on port 8080

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run type-check   # TypeScript type checking
npm run lint         # Lint code
```

## 🔐 Authentication

The frontend uses **cookie-based authentication** with HTTP-only cookies:

- **Traditional Login**: Email/password via `/api/oauth/token`
- **Google SSO**: Redirect to `/api/oauth2/authorization/google`
- **Azure SSO**: Redirect to `/api/oauth2/authorization/azure`  
- **Auth Check**: `/api/oauth/me` endpoint
- **Logout**: `/api/oauth/logout` endpoint

No client-side token management required - all handled by secure HTTP-only cookies.

## 🌐 API Integration

### REST API

```typescript
import { apiClient } from '@/api/client'

// GET request
const data = await apiClient.get('/devices')

// POST request  
const result = await apiClient.post('/devices', deviceData)
```

### GraphQL

```typescript
import { useGraphQLClient } from '@/api/graphql'
import { useQuery } from '@tanstack/react-query'

const client = useGraphQLClient()
const { data } = useQuery({
  queryKey: ['devices'],
  queryFn: () => client.request(GET_DEVICES_QUERY)
})
```

## 🎨 Styling

Uses Tailwind CSS with custom design system:

```typescript
import { cn } from '@/lib/utils'

<button className={cn(
  "px-4 py-2 rounded",
  "bg-primary text-primary-foreground", 
  "hover:bg-primary/90"
)}>
  Click me
</button>
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode  
npm run test -- --watch

# Run with coverage
npm run test:coverage
```

## 🔧 Configuration

### Vite Proxy

The development server proxies `/api/*` requests to `http://localhost:8080` (Spring backend).

### Environment Variables

Create `.env.local` for local overrides:

```env
VITE_API_URL=http://localhost:8080
```

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Output goes to dist/
# Serve static files from Spring Boot
```

## 🚦 Next Steps

1. **Phase 1**: Core authentication and routing ✅
2. **Phase 2**: Device management components  
3. **Phase 3**: MDM/RMM/RAC modules
4. **Phase 4**: Advanced features and optimization

## 🤝 Development Guidelines

- Use TypeScript for all new code
- Follow React Hooks patterns
- Test components with Vitest
- Use Tailwind for styling
- Cookie-based auth only (no tokens)
- API calls via TanStack Query

---

**Status**: 🚧 Initial setup complete - ready for feature development!