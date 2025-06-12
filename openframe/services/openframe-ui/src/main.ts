// @ts-ignore
import { createApp, provide, h } from 'vue'
// @ts-ignore
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
import Tooltip from 'primevue/tooltip'
import InputSwitch from 'primevue/inputswitch'
import InputNumber from 'primevue/inputnumber'
import ConfirmationService from 'primevue/confirmationservice';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { DefaultApolloClient } from '@vue/apollo-composable'
import { apolloClient } from './apollo/apolloClient'
// Import UI components
import * as UIComponents from './components/ui'

// PrimeVue styles
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

// Custom styles
import './style.css'
import './assets/styles/theme.css'

// Check authentication before app mount
const token = localStorage.getItem('access_token')
const currentPath = window.location.pathname

if (!token && currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/oauth2/callback/google') {
    window.location.href = '/login'
} else {
    // Global URL change tracking
    console.log('�� [Main] Initial URL:', window.location.href);

    // Track URL changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        console.log('🌐 [Main] URL changed via pushState:', args[2] || window.location.href);
        return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
        console.log('🌐 [Main] URL changed via replaceState:', args[2] || window.location.href);
        return originalReplaceState.apply(history, args);
    };

    window.addEventListener('popstate', (event) => {
        console.log('🌐 [Main] URL changed via popstate:', window.location.href);
    });

    // Track hash changes
    window.addEventListener('hashchange', (event) => {
        console.log('🌐 [Main] Hash changed:', { oldURL: event.oldURL, newURL: event.newURL });
    });

    const app = createApp({
        setup() {
            provide(DefaultApolloClient, apolloClient)
            return () => h(App)
        }
    })
    app.use(createPinia())
    app.use(router)
    app.use(PrimeVue, { ripple: true })
    app.component('Sidebar', Sidebar)
    app.component('Toast', Toast)
    app.component('Button', Button)
    app.component('InputText', InputText)
    app.component('DataTable', DataTable)
    app.component('Column', Column)
    app.component('InputSwitch', InputSwitch)
    app.component('InputNumber', InputNumber)
    app.component('TabView', TabView)
    app.component('TabPanel', TabPanel)
    app.directive('tooltip', Tooltip)
    app.use(ToastService);
    app.use(ConfirmationService);
    
    // Register all UI components
    Object.entries(UIComponents).forEach(([name, component]) => {
      // Only register components that are not directives and not already registered globally
      if (name !== 'TooltipDirective' && 
          !['Button', 'InputText', 'DataTable', 'Column'].includes(name)) {
        app.component(name, component);
      }
    });
    
    app.mount('#app')
}
