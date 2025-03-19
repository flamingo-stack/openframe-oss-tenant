// Runtime configuration that can be injected via Kubernetes
interface RuntimeConfig {
  apiUrl: string;
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
}

// Default values that will be overridden by injected config
const defaultConfig: RuntimeConfig = {
  apiUrl: import.meta.env.VITE_API_URL || import.meta.env.API_URL || 'http://localhost:8090',
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || import.meta.env.GATEWAY_URL || 'http://localhost:8100',
  clientId: import.meta.env.VITE_CLIENT_ID || import.meta.env.CLIENT_ID || 'openframe_web_dashboard',
  clientSecret: import.meta.env.VITE_CLIENT_SECRET || import.meta.env.CLIENT_SECRET || 'prod_secret'
};

// Function to load runtime config from window.__RUNTIME_CONFIG__
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export const runtimeConfig: RuntimeConfig = {
  ...defaultConfig,
  ...(window.__RUNTIME_CONFIG__ || {})
};