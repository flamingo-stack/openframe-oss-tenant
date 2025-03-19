/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_URL: string
  readonly GATEWAY_URL: string
  readonly CLIENT_ID: string
  readonly CLIENT_SECRET: string
  readonly PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
