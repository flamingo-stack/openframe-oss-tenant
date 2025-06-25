import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import OAuthCallback from '../views/auth/OAuthCallback.vue'
import Monitoring from '../views/Monitoring.vue'
import Tools from '../views/Tools.vue'
import SettingsView from '../views/SettingsView.vue'
import MDMLayout from '../views/mdm/MDMLayout.vue'
import MDMDashboard from '../views/mdm/Dashboard.vue'
import MDMDevices from '../views/mdm/Devices.vue'
import MDMProfiles from '../views/mdm/Profiles.vue'
import MDMPolicies from '../views/mdm/Policies.vue'
import MDMQueries from '../views/mdm/Queries.vue'
import MDMSettings from '../views/mdm/Settings.vue'
import Settings from '../views/mdm/Settings.vue'
import Profiles from '../views/mdm/Profiles.vue'
import SettingsCategory from '../views/mdm/SettingsCategory.vue'
import SystemArchitecture from '../views/SystemArchitecture.vue'
import RMMLayout from '../views/rmm/RMMLayout.vue'
import RMMDashboard from '../views/rmm/Dashboard.vue'
import RMMDevices from '../views/rmm/Devices.vue'
import RMMMonitoring from '../views/rmm/Monitoring.vue'
import RMMScripts from '../views/rmm/Scripts.vue'
import RMMEvents from '../views/rmm/Events.vue'
import RMMAutomation from '../views/rmm/Automation.vue'
import RMMSettings from '../views/rmm/Settings.vue'
import RACLayout from '../views/rac/RACLayout.vue'
import RACDashboard from '../views/rac/Dashboard.vue'
import RACDevices from '../views/rac/Devices.vue'
import RACRemoteConnection from '../views/rac/RemoteConnection.vue'
import RACFileTransfer from '../views/rac/FileTransfer.vue'
import RACSettings from '../views/rac/Settings.vue'
import { AuthService } from '@/services/AuthService';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      meta: { requiresAuth: false }
    },
    {
      path: '/oauth2/callback/google',
      name: 'oauth-callback-google',
      component: OAuthCallback,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: SystemArchitecture,
      meta: { 
        requiresAuth: true,
        title: 'Dashboard',
        icon: 'pi pi-home'
      }
    },
    {
      path: '/monitoring',
      name: 'monitoring',
      component: Monitoring,
      meta: { 
        requiresAuth: true,
        title: 'Monitoring',
        icon: 'pi pi-chart-line'
      }
    },
    {
      path: '/tools',
      name: 'tools',
      component: Tools,
      meta: { 
        requiresAuth: true,
        title: 'Tools',
        icon: 'pi pi-cog'
      }
    },
    {
      path: '/mdm',
      component: MDMLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/mdm/dashboard'
        },
        {
          path: 'dashboard',
          name: 'mdm-dashboard',
          component: MDMDashboard
        },
        {
          path: 'devices',
          name: 'mdm-devices',
          component: MDMDevices
        },
        {
          path: 'profiles',
          name: 'mdm-profiles',
          component: MDMProfiles
        },
        {
          path: 'policies',
          name: 'mdm-policies',
          component: MDMPolicies
        },
        {
          path: 'queries',
          name: 'mdm-queries',
          component: MDMQueries
        },
        {
          path: 'settings',
          component: Settings,
          children: [
            {
              path: '',
              redirect: { name: 'mdm-settings-category', params: { category: 'org_info' } }
            },
            {
              path: ':category',
              name: 'mdm-settings-category',
              component: SettingsCategory,
              props: true
            }
          ]
        }
      ]
    },
    {
      path: '/rmm',
      component: RMMLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/rmm/dashboard'
        },
        {
          path: 'dashboard',
          name: 'rmm-dashboard',
          component: RMMDashboard,
          meta: { title: 'RMM Dashboard' }
        },
        {
          path: 'devices',
          name: 'rmm-devices',
          component: RMMDevices,
          meta: { title: 'RMM Devices' }
        },
        {
          path: 'monitoring',
          name: 'rmm-monitoring',
          component: RMMMonitoring,
          meta: { title: 'RMM Monitoring' }
        },
        {
          path: 'scripts',
          name: 'rmm-scripts',
          component: RMMScripts,
          meta: { title: 'RMM Scripts' }
        },
        /* History route removed in favor of Events */
        {
          path: 'events',
          name: 'rmm-events',
          component: RMMEvents,
          meta: { title: 'RMM Events' }
        },
        {
          path: 'bulkops',
          name: 'rmm-bulkops',
          component: () => import('../views/rmm/BulkOps.vue'),
          meta: { title: 'RMM Bulk Operations' }
        },
        {
          path: 'automation',
          name: 'rmm-automation',
          component: RMMAutomation,
          meta: { title: 'RMM Automation' }
        },
        {
          path: 'settings',
          component: RMMSettings,
          children: [
            {
              path: '',
              redirect: { name: 'rmm-settings-category', params: { category: 'general' } }
            },
            {
              path: ':category',
              name: 'rmm-settings-category',
              component: () => import('../views/rmm/SettingsCategory.vue'),
              props: true
            }
          ],
          meta: { title: 'RMM Settings' }
        }
      ]
    },
    {
      path: '/rac',
      component: RACLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/rac/dashboard'
        },
        {
          path: 'dashboard',
          name: 'rac-dashboard',
          component: RACDashboard,
          meta: { title: 'RAC Dashboard' }
        },
        {
          path: 'devices',
          name: 'rac-devices',
          component: RACDevices,
          meta: { title: 'RAC Devices' }
        },
        {
          path: 'remote-connection',
          name: 'rac-remote-connection',
          component: RACRemoteConnection,
          meta: { title: 'RAC Remote Connection' }
        },
        {
          path: 'remote-connection/:id',
          name: 'rac-remote-connection-device',
          component: RACRemoteConnection,
          meta: { title: 'RAC Remote Connection' },
          props: true
        },
        {
          path: 'file-transfer',
          name: 'rac-file-transfer',
          component: RACFileTransfer,
          meta: { title: 'RAC File Transfer' }
        },
        {
          path: 'file-transfer/:id',
          name: 'rac-file-transfer-device',
          component: RACFileTransfer,
          meta: { title: 'RAC File Transfer' },
          props: true
        },
        {
          path: 'settings',
          name: 'rac-settings',
          component: RACSettings,
          meta: { title: 'RAC Settings' }
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { 
        requiresAuth: true,
        title: 'Settings',
        icon: 'pi pi-cog'
      }
    },
    {
      path: '/sso',
      name: 'sso',
      component: () => import('../views/SSOView.vue'),
      meta: { 
        requiresAuth: true,
        title: 'SSO Configuration',
        icon: 'pi pi-key'
      }
    },
    {
      path: '/api-keys',
      name: 'api-keys',
      component: () => import('../views/ApiKeys.vue'),
      meta: { 
        requiresAuth: true,
        title: 'API Keys',
        icon: 'pi pi-shield'
      }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('access_token');
  console.log('🚦 [Router] ===== NAVIGATION GUARD =====');
  console.log('🚦 [Router] Navigation:', { 
    to: to.path, 
    from: from.path, 
    token: !!token,
    toName: to.name,
    fromName: from.name,
    toMeta: to.meta
  });
  console.log('🚦 [Router] Current URL:', window.location.href);
  console.log('🚦 [Router] To fullPath:', to.fullPath);
  console.log('🚦 [Router] To query:', to.query);
  
  // Special handling for OAuth callback
  if (to.path === '/oauth2/callback/google') {
    console.log('🔑 [Router] OAuth callback detected!');
    console.log('🔑 [Router] OAuth callback query params:', to.query);
    console.log('🔑 [Router] Allowing OAuth callback to proceed');
    next();
    return;
  }
  
  // Always allow access to auth pages
  if (!to.meta.requiresAuth) {
    if (to.path === '/login' && token) {
      console.log('↩️ [Router] Already logged in, redirecting to home');
      next('/dashboard');
    } else {
      console.log('➡️ [Router] Proceeding to public route:', to.path);
      next();
    }
    return;
  }

  // Handle protected routes
  if (!token) {
    console.log('🔒 [Router] No token found, redirecting to login');
    next('/login');
    return;
  }

  // Skip token validation for immediate post-OAuth navigation
  if (from.path === '/oauth2/callback/google') {
    console.log('🔑 [Router] Coming from OAuth callback, skipping token validation');
    next();
    return;
  }

  // For all other protected routes, validate the token
  try {
    console.log('🔍 [Router] Verifying token validity...');
    await AuthService.getUserInfo();
    console.log('✅ [Router] Token is valid, proceeding to route');
    next();
  } catch (error) {
    console.error('❌ [Router] Token validation failed:', error);
    // Clear tokens and redirect to login
    const authStore = useAuthStore();
    authStore.logout();
    next('/login');
  }
});

export default router                                                                                