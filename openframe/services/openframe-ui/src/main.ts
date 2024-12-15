import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import router from './router'
import App from './App.vue'
import Sidebar from 'primevue/sidebar'
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

// PrimeVue styles
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Custom styles
import './style.css'
import './assets/styles/components.css'

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
    app.component('Sidebar', Sidebar)
    app.use(ToastService);
    app.component('Toast', Toast);
    app.component('Button', Button)
    app.component('InputText', InputText)
    app.component('DataTable', DataTable)
    app.component('Column', Column)
    app.mount('#app')
}
