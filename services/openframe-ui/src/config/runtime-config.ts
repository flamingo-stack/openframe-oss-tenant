// Runtime configuration that can be injected via Kubernetes
export interface RuntimeConfig {
  apiUrl: string;
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
  grafanaUrl: string;
}

// Default values that will be overridden by injected config
const defaultConfig: RuntimeConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8100',
  clientId: import.meta.env.VITE_CLIENT_ID || 'openframe_web_dashboard',
  clientSecret: import.meta.env.VITE_CLIENT_SECRET || 'prod_secret',
  grafanaUrl: import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3000'
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