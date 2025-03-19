/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_GATEWAY_URL: string
  readonly VITE_CLIENT_ID: string
  readonly VITE_CLIENT_SECRET: string
  readonly PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
