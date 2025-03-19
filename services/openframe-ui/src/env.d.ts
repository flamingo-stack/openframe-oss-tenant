/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GATEWAY_URL: string;
  readonly VITE_CLIENT_ID: string;
  readonly VITE_CLIENT_SECRET: string;
  readonly VITE_GRAFANA_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vue' {
  export function ref<T>(value: T): { value: T }
}

declare module 'pinia' {
  export function defineStore(
    id: string,
    setup: () => any
  ): () => any
  export function storeToRefs<T extends object>(store: T): T
}