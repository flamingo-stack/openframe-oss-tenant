import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
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
  console.log('🚦 [Router] Navigation:', { to: to.path, from: from.path, token: !!token });
  
  // Always allow access to auth pages
  if (!to.meta.requiresAuth) {
    if (to.path === '/login' && token) {
      console.log('↩️ [Router] Already logged in, redirecting to home');
      next('/');
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

  // Only validate token if we're not coming from login
  if (from.path !== '/login') {
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
  } else {
    // If coming from login, trust the token is valid
    console.log('✅ [Router] Coming from login, proceeding to route');
    next();
  }
});

export default router 