// Runtime configuration that can be injected via Kubernetes
export interface RuntimeConfig {
  apiUrl: string;
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
  grafanaUrl: string;
}

// Create a secure proxy that hides sensitive data
const createSecureConfig = (config: RuntimeConfig): RuntimeConfig => {
  return new Proxy(config, {
    get(target, prop) {
      // Hide sensitive data
      if (prop === 'clientSecret') {
        return undefined;
      }
      // Allow access to other properties
      return target[prop as keyof RuntimeConfig];
    },
    set() {
      return false; // Prevent modifications
    },
    ownKeys(target) {
      // Hide sensitive data from enumeration
      return Object.keys(target).filter(key => key !== 'clientSecret');
    },
    getOwnPropertyDescriptor(target, prop) {
      // Hide sensitive data from property descriptors
      if (prop === 'clientSecret') {
        return undefined;
      }
      return Object.getOwnPropertyDescriptor(target, prop);
    }
  });
};

// Default values that will be overridden by injected config
const defaultConfig: RuntimeConfig = {
  apiUrl: 'http://localhost:8090',
  gatewayUrl: 'http://localhost:8100',
  clientId: 'openframe_web_dashboard',
  clientSecret: 'prod_secret',
  grafanaUrl: 'http://localhost:3000'
};

// Create a secure version of the config
export const runtimeConfig: RuntimeConfig = createSecureConfig({
  ...defaultConfig,
  apiUrl: import.meta.env.VITE_API_URL || defaultConfig.apiUrl,
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || defaultConfig.gatewayUrl,
  clientId: import.meta.env.VITE_CLIENT_ID || defaultConfig.clientId,
  clientSecret: import.meta.env.VITE_CLIENT_SECRET || defaultConfig.clientSecret,
  grafanaUrl: import.meta.env.VITE_GRAFANA_URL || defaultConfig.grafanaUrl
});

// Prevent direct access to the config object
Object.freeze(runtimeConfig);