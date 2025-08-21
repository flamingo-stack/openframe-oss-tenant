import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

// Auth pages
import AuthPage from '@/pages/auth';
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage';

// Main pages
import { DashboardPage } from '@/pages/DashboardPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { MonitoringPage } from '@/pages/MonitoringPage';
import { ToolsPage } from '@/pages/ToolsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SSOPage } from '@/pages/SSOPage';
import { ApiKeysPage } from '@/pages/ApiKeysPage';
import { ProfilePage } from '@/pages/ProfilePage';

// Module layouts
import { MDMLayout } from '@/pages/mdm/MDMLayout';
import { RMMLayout } from '@/pages/rmm/RMMLayout';
import { RACLayout } from '@/pages/rac/RACLayout';

// MDM pages
import { MDMDashboard } from '@/pages/mdm/MDMDashboard';
import { MDMDevices } from '@/pages/mdm/MDMDevices';
import { MDMProfiles } from '@/pages/mdm/MDMProfiles';
import { MDMPolicies } from '@/pages/mdm/MDMPolicies';
import { MDMQueries } from '@/pages/mdm/MDMQueries';
import { MDMSettings } from '@/pages/mdm/MDMSettings';
import { MDMSettingsCategory } from '@/pages/mdm/MDMSettingsCategory';

// RMM pages
import { RMMDashboard } from '@/pages/rmm/RMMDashboard';
import { RMMDevices } from '@/pages/rmm/RMMDevices';
import { RMMMonitoring } from '@/pages/rmm/RMMMonitoring';
import { RMMScripts } from '@/pages/rmm/RMMScripts';
import { RMMEvents } from '@/pages/rmm/RMMEvents';
import { RMMBulkOps } from '@/pages/rmm/RMMBulkOps';
import { RMMAutomation } from '@/pages/rmm/RMMAutomation';
import { RMMSettings } from '@/pages/rmm/RMMSettings';
import { RMMSettingsCategory } from '@/pages/rmm/RMMSettingsCategory';

// RAC pages
import { RACDashboard } from '@/pages/rac/RACDashboard';
import { RACDevices } from '@/pages/rac/RACDevices';
import { RACRemoteConnection } from '@/pages/rac/RACRemoteConnection';
import { RACFileTransfer } from '@/pages/rac/RACFileTransfer';
import { RACSettings } from '@/pages/rac/RACSettings';

// Layout wrapper for protected routes
const ProtectedLayout = () => (
  <ProtectedRoute>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // Auth routes (no layout)
  {
    path: '/auth',
    element: <AuthPage />
  },
  {
    path: '/auth/signup',
    element: <AuthPage />
  },
  {
    path: '/auth/login',
    element: <AuthPage />
  },
  {
    path: '/login',
    element: <Navigate to="/auth" replace />
  },
  {
    path: '/register',
    element: <Navigate to="/auth" replace />
  },
  {
    path: '/oauth2/callback/google',
    element: <OAuthCallbackPage />
  },
  // Root redirect
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  // Protected routes with layout
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />
      },
      {
        path: '/devices',
        element: <DevicesPage />
      },
      {
        path: '/monitoring',
        element: <MonitoringPage />
      },
      {
        path: '/tools',
        element: <ToolsPage />
      },
      {
        path: '/settings',
        element: <SettingsPage />
      },
      {
        path: '/sso',
        element: <SSOPage />
      },
      {
        path: '/api-keys',
        element: <ApiKeysPage />
      },
      {
        path: '/profile',
        element: <ProfilePage />
      }
    ]
  },
  // MDM Routes
  {
    path: '/mdm',
    element: <ProtectedLayout />,
    children: [
      {
        element: <MDMLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/mdm/dashboard" replace />
          },
          {
            path: 'dashboard',
            element: <MDMDashboard />
          },
          {
            path: 'devices', 
            element: <MDMDevices />
          },
          {
            path: 'profiles',
            element: <MDMProfiles />
          },
          {
            path: 'policies',
            element: <MDMPolicies />
          },
          {
            path: 'queries',
            element: <MDMQueries />
          },
          {
            path: 'settings',
            element: <MDMSettings />,
            children: [
              {
                index: true,
                element: <Navigate to="/mdm/settings/org_info" replace />
              },
              {
                path: ':category',
                element: <MDMSettingsCategory />
              }
            ]
          }
        ]
      }
    ]
  },
  // RMM Routes
  {
    path: '/rmm',
    element: <ProtectedLayout />,
    children: [
      {
        element: <RMMLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/rmm/dashboard" replace />
          },
          {
            path: 'dashboard',
            element: <RMMDashboard />
          },
          {
            path: 'devices',
            element: <RMMDevices />
          },
          {
            path: 'monitoring',
            element: <RMMMonitoring />
          },
          {
            path: 'scripts',
            element: <RMMScripts />
          },
          {
            path: 'events',
            element: <RMMEvents />
          },
          {
            path: 'bulkops',
            element: <RMMBulkOps />
          },
          {
            path: 'automation',
            element: <RMMAutomation />
          },
          {
            path: 'settings',
            element: <RMMSettings />,
            children: [
              {
                index: true,
                element: <Navigate to="/rmm/settings/general" replace />
              },
              {
                path: ':category',
                element: <RMMSettingsCategory />
              }
            ]
          }
        ]
      }
    ]
  },
  // RAC Routes
  {
    path: '/rac',
    element: <ProtectedLayout />,
    children: [
      {
        element: <RACLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/rac/dashboard" replace />
          },
          {
            path: 'dashboard',
            element: <RACDashboard />
          },
          {
            path: 'devices',
            element: <RACDevices />
          },
          {
            path: 'remote-connection',
            element: <RACRemoteConnection />
          },
          {
            path: 'remote-connection/:id',
            element: <RACRemoteConnection />
          },
          {
            path: 'file-transfer',
            element: <RACFileTransfer />
          },
          {
            path: 'file-transfer/:id',
            element: <RACFileTransfer />
          },
          {
            path: 'settings',
            element: <RACSettings />
          }
        ]
      }
    ]
  }
]);