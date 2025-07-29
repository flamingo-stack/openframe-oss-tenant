/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PLATFORM_TYPE: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}