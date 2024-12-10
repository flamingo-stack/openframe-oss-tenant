import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import router from './router'
import App from './App.vue'

// PrimeVue styles
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Custom styles
import './style.css'

// Check authentication before app mount
const token = localStorage.getItem('access_token')
const currentPath = window.location.pathname

if (!token && currentPath !== '/login' && currentPath !== '/register') {
    window.location.href = '/login'
} else {
    const app = createApp(App)
    app.use(createPinia())
    app.use(router)
    app.use(PrimeVue, { ripple: true })
    app.mount('#app')
}
