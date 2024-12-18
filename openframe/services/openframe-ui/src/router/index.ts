import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Monitoring from '../views/Monitoring.vue'
import Tools from '../views/Tools.vue'
import SettingsView from '../views/SettingsView.vue'

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