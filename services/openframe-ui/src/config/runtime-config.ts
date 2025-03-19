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
  apiUrl: 'http://localhost:8090',
  gatewayUrl: 'http://localhost:8100',
  clientId: 'openframe_web_dashboard',
  clientSecret: 'prod_secret',
  grafanaUrl: 'http://localhost:3000'
};

// Function to load runtime config from window.__RUNTIME_CONFIG__
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: (key: keyof RuntimeConfig) => string | undefined;
  }
}

// Create a secure version of the config
export const runtimeConfig: RuntimeConfig = new Proxy(defaultConfig, {
  get(target, prop) {
    if (prop === 'clientSecret') {
      return undefined;
    }

    // Try to get value from runtime config first
    if (window.__RUNTIME_CONFIG__) {
      const value = window.__RUNTIME_CONFIG__(prop as keyof RuntimeConfig);
      if (value !== undefined) {
        return value;
      }
    }

    // Fall back to default value
    return target[prop as keyof RuntimeConfig];
  },
  set() {
    return false; // Prevent modifications
  },
  ownKeys(target) {
    return Object.keys(target).filter(key => key !== 'clientSecret');
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop === 'clientSecret') {
      return undefined;
    }
    return Object.getOwnPropertyDescriptor(target, prop);
  }
});

// Prevent direct access to the config object
Object.freeze(runtimeConfig);