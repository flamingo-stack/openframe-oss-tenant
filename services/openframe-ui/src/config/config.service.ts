interface RuntimeConfig {
  apiUrl: string;
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
}

// Default values that will be overridden by injected config
const defaultConfig: RuntimeConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8100',
  clientId: import.meta.env.VITE_CLIENT_ID || 'openframe_web_dashboard',
  clientSecret: import.meta.env.VITE_CLIENT_SECRET || 'prod_secret'
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

export class ConfigService {
  private static instance: ConfigService;
  private config: RuntimeConfig;

  private constructor() {
    this.config = runtimeConfig;
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public get apiUrl(): string {
    return this.config.apiUrl;
  }

  public get gatewayUrl(): string {
    return this.config.gatewayUrl;
  }

  public get clientId(): string {
    return this.config.clientId;
  }

  public get clientSecret(): string {
    return this.config.clientSecret;
  }

  public updateConfig(newConfig: Partial<RuntimeConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }
}