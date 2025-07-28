import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import App from './App.tsx'
import { apolloClient } from './lib/apollo-client.ts'
import { AuthProvider } from './hooks/useAuth'
import { DynamicThemeProvider } from '@flamingo/ui-kit/components/providers/dynamic-theme-provider'

// Import UI Kit styles
import '@flamingo/ui-kit/styles'
import './styles/ui-kit-bridge.css'
import './index.css'

// Set platform type for UI Kit theming
if (typeof window !== 'undefined') {
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  window.process.env.NEXT_PUBLIC_APP_TYPE = 'openframe';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DynamicThemeProvider>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ApolloProvider>
    </DynamicThemeProvider>
  </React.StrictMode>,
)