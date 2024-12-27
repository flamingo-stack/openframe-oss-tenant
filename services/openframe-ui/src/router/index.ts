import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Monitoring from '../views/Monitoring.vue'
import Tools from '../views/Tools.vue'
import SettingsView from '../views/SettingsView.vue'
import Dashboard from '../views/Dashboard.vue'
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
      component: Dashboard,
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
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (!to.meta.requiresAuth && token) {
    next('/')
  } else {
    next()
  }
})

export default router 