import type { RuntimeConfig } from '@/types/config';

class ConfigService {
  private static instance: ConfigService;
  private config: RuntimeConfig;

  private constructor() {
    // Load configuration from window.__RUNTIME_CONFIG__ or fallback to import.meta.env
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__ || {};

    this.config = {
      apiUrl: runtimeConfig.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8090',
      gatewayUrl: runtimeConfig.gatewayUrl || import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8090',
      clientId: runtimeConfig.clientId || import.meta.env.VITE_CLIENT_ID || 'openframe-ui',
      clientSecret: runtimeConfig.clientSecret || import.meta.env.VITE_CLIENT_SECRET || 'openframe-ui-secret'
    };

    // Ensure API URL doesn't end with a slash
    this.config.apiUrl = this.config.apiUrl.replace(/\/$/, '');

    console.log('🔧 [Config] Loaded configuration:', {
      ...this.config,
      clientSecret: '***' // Hide sensitive data in logs
    });
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
    console.log('🔧 [Config] Updated configuration:', {
      ...this.config,
      clientSecret: '***' // Hide sensitive data in logs
    });
  }
}

export { ConfigService };