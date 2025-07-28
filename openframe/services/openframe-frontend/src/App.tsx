import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { DevicesPage } from './pages/DevicesPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { ToolsPage } from './pages/ToolsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SSOPage } from './pages/SSOPage'
import { ApiKeysPage } from './pages/ApiKeysPage'
import { ProfilePage } from './pages/ProfilePage'

// Import UI Kit components for theming
import { Toaster } from '@flamingo/ui-kit/components/ui'

function App() {
  // Set the platform type for proper ODS theming
  useEffect(() => {
    document.body.setAttribute('data-app-type', 'openframe');
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen"
           data-app-type="openframe">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth2/callback/google" element={<OAuthCallbackPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/devices" 
            element={
              <ProtectedRoute>
                <DevicesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/monitoring" 
            element={
              <ProtectedRoute>
                <MonitoringPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tools" 
            element={
              <ProtectedRoute>
                <ToolsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sso" 
            element={
              <ProtectedRoute>
                <SSOPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/api-keys" 
            element={
              <ProtectedRoute>
                <ApiKeysPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
        </Routes>
        
        {/* Global toast notifications */}
        <Toaster />
      </div>
    </AuthProvider>
  )
}

export default App