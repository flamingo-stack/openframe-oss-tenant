import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Monitoring from '../views/Monitoring.vue'
import HostsView from '@/views/HostsView.vue'

const router = createRouter({
  history: createWebHistory(),
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
      name: 'home',
      component: Monitoring,
      meta: { 
        requiresAuth: true,
        title: 'Monitoring and Tools',
        icon: 'pi pi-chart-line'
      }
    },
    {
      path: '/hosts',
      name: 'hosts',
      component: HostsView,
      meta: { 
        requiresAuth: true,
        title: 'Hosts',
        icon: 'pi pi-desktop'
      }
    },
    {
      path: '/hosts/add',
      name: 'hosts-add',
      component: () => import('@/views/hosts/AddHost.vue'),
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