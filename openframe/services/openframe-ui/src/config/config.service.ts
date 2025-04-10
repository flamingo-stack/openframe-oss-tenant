import { ref } from 'vue';

interface Config {
  apiUrl: string;
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
  grafanaUrl: string;
}

class ConfigService {
  private static instance: ConfigService;
  private config: Config;
  private configRef = ref<Config | null>(null);

  private constructor() {
    // Get configuration from environment variables
    const apiUrl = import.meta.env.VITE_API_URL;
    const gatewayUrl = import.meta.env.VITE_GATEWAY_URL;
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_CLIENT_SECRET;
    const grafanaUrl = import.meta.env.VITE_GRAFANA_URL;

    // Log configuration (excluding sensitive data)
    console.log('🔧 [Config] Environment Variables:', {
      apiUrl,
      gatewayUrl,
      clientId,
      clientSecret: '***',
      grafanaUrl
    });

    // Validate and set configuration
    this.config = {
      apiUrl: this.validateUrl(apiUrl, 'API URL'),
      gatewayUrl: this.validateUrl(gatewayUrl, 'Gateway URL'),
      clientId: this.validateString(clientId, 'Client ID'),
      clientSecret: this.validateString(clientSecret, 'Client Secret'),
      grafanaUrl: this.validateUrl(grafanaUrl, 'Grafana URL')
    };

    this.configRef.value = this.config;

    // Log validated configuration
    console.log('✅ [Config] Validated Configuration:', {
      apiUrl: this.config.apiUrl,
      gatewayUrl: this.config.gatewayUrl,
      clientId: this.config.clientId,
      clientSecret: '***',
      grafanaUrl: this.config.grafanaUrl
    });
  }

  private validateUrl(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`${name} is not configured. Please set VITE_${name.toUpperCase().replace(' ', '_')} in your environment.`);
    }
    try {
      const url = new URL(value);
      if (!url.protocol) {
        throw new Error(`${name} must include a protocol (http:// or https://)`);
      }
      return value;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`${name} is not a valid URL: ${error.message}`);
      }
      throw new Error(`${name} is not a valid URL: ${value}`);
    }
  }

  private validateString(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`${name} is not configured. Please set VITE_${name.toUpperCase().replace(' ', '_')} in your environment.`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${name} cannot be empty`);
    }
    return value;
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getConfig(): Config {
    return this.config;
  }

  public getConfigRef() {
    return this.configRef;
  }

  public updateConfig(newConfig: Partial<Config>): void {
    console.log('🔄 [Config] Updating configuration:', {
      ...newConfig,
      clientSecret: newConfig.clientSecret ? '***' : undefined
    });

    if (newConfig.apiUrl) {
      this.config.apiUrl = this.validateUrl(newConfig.apiUrl, 'API URL');
    }
    if (newConfig.gatewayUrl) {
      this.config.gatewayUrl = this.validateUrl(newConfig.gatewayUrl, 'Gateway URL');
    }
    if (newConfig.clientId) {
      this.config.clientId = this.validateString(newConfig.clientId, 'Client ID');
    }
    if (newConfig.clientSecret) {
      this.config.clientSecret = this.validateString(newConfig.clientSecret, 'Client Secret');
    }
    if (newConfig.grafanaUrl) {
      this.config.grafanaUrl = this.validateUrl(newConfig.grafanaUrl, 'Grafana URL');
    }
    this.configRef.value = this.config;

    console.log('✅ [Config] Updated configuration:', {
      apiUrl: this.config.apiUrl,
      gatewayUrl: this.config.gatewayUrl,
      clientId: this.config.clientId,
      clientSecret: '***',
      grafanaUrl: this.config.grafanaUrl
    });
  }
}

export { ConfigService };