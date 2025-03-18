/// <reference types="vite/client" />

declare module 'vue' {
  export function ref<T>(value: T): { value: T }
}

declare module 'pinia' {
  export function defineStore(
    id: string,
    setup: () => any
  ): () => any
}