import { ref } from 'vue';

interface RuntimeConfig {
  apiUrl?: string;
  gatewayUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

interface Config {
  apiUrl: string;
  gatewayUrl: string;
  clientId: string;
  clientSecret: string;
}

class ConfigService {
  private static instance: ConfigService;
  private config: Config;
  private configRef = ref<Config | null>(null);

  private constructor() {
    // Get runtime config from window object if available
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__ as RuntimeConfig || {};
    console.log('🔍 [Config] Runtime config:', runtimeConfig);
    console.log('🔍 [Config] import.meta.env:', import.meta.env);

    // Get environment variables with fallbacks
    const apiUrl = runtimeConfig.apiUrl || import.meta.env.VITE_API_URL || import.meta.env.API_URL;
    const gatewayUrl = runtimeConfig.gatewayUrl || import.meta.env.VITE_GATEWAY_URL || import.meta.env.GATEWAY_URL;
    const clientId = runtimeConfig.clientId || import.meta.env.VITE_CLIENT_ID || import.meta.env.CLIENT_ID;
    const clientSecret = runtimeConfig.clientSecret || import.meta.env.VITE_CLIENT_SECRET || import.meta.env.CLIENT_SECRET;

    console.log('🔍 [Config] Resolved values:', {
      apiUrl,
      gatewayUrl,
      clientId,
      clientSecret: clientSecret ? '***' : undefined
    });

    // Validate and set configuration
    this.config = {
      apiUrl: this.validateUrl(apiUrl, 'API URL'),
      gatewayUrl: this.validateUrl(gatewayUrl, 'Gateway URL'),
      clientId: this.validateString(clientId, 'Client ID'),
      clientSecret: this.validateString(clientSecret, 'Client Secret')
    };

    this.configRef.value = this.config;
    console.log('🔧 [Config] Loaded configuration:', {
      apiUrl: this.config.apiUrl,
      gatewayUrl: this.config.gatewayUrl,
      clientId: this.config.clientId,
      clientSecret: '***'
    });
  }

  private validateUrl(value: string | undefined, name: string): string {
    console.log(`🔍 [Config] Validating URL for ${name}:`, value);
    if (!value) {
      throw new Error(`${name} is not configured. Please set ${name.toUpperCase().replace(' ', '_')} in your environment.`);
    }
    try {
      new URL(value);
      return value;
    } catch {
      throw new Error(`${name} is not a valid URL: ${value}`);
    }
  }

  private validateString(value: string | undefined, name: string): string {
    console.log(`🔍 [Config] Validating string for ${name}:`, value);
    if (!value) {
      throw new Error(`${name} is not configured. Please set ${name.toUpperCase().replace(' ', '_')} in your environment.`);
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
}

export { ConfigService };