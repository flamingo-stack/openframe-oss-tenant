declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'primevue/config' {
  import { Plugin } from 'vue'
  const plugin: Plugin
  export default plugin
}

declare module 'primevue/*' {
  import { Component } from 'vue'
  const component: Component
  export default component
} 