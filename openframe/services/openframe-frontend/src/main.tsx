import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import App from './App.tsx'
import { apolloClient } from './lib/apollo-client.ts'
import { AuthProvider } from './hooks/useAuth'
import { TooltipProvider, Toaster } from '@flamingo/ui-kit/components/ui'
import { DynamicThemeProvider } from '@flamingo/ui-kit/components/features'

// Import UI Kit styles - single source of truth
import '@flamingo/ui-kit/styles'

// Set platform type for UI Kit theming and force dark mode like multi-platform-hub
if (typeof window !== 'undefined') {
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  window.process.env.NEXT_PUBLIC_APP_TYPE = 'openframe';
  
  // Force dark theme like multi-platform-hub with correct attributes
  document.documentElement.className = 'dark';
  document.documentElement.setAttribute('data-app-type', 'openframe');
  
  // Set body attributes for platform theming like multi-platform-hub
  document.body.setAttribute('data-platform', 'openframe');
  document.body.className = 'min-h-screen antialiased font-body';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DynamicThemeProvider>
      <TooltipProvider>
        <ApolloProvider client={apolloClient}>
          <AuthProvider>
            <BrowserRouter>
              <App />
              <Toaster />
            </BrowserRouter>
          </AuthProvider>
        </ApolloProvider>
      </TooltipProvider>
    </DynamicThemeProvider>
  </React.StrictMode>,
)