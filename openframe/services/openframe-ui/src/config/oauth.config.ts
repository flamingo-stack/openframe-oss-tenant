export interface OAuthConfig {
  google: {
    clientId: string;
    redirectUri: string;
    scope: string;
  };
}

export interface SSOProvider {
  enabled: boolean;
  provider: string;
  clientId: string;
}

export class OAuthConfigService {
  private static instance: OAuthConfigService;
  private config: OAuthConfig;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // Get the current origin (includes protocol, hostname, and port)
    const currentOrigin = window.location.origin;
    console.log('🔑 [OAuthConfig] Current origin:', currentOrigin);
    console.log('🔑 [OAuthConfig] Current location:', window.location.href);
    
    // Initialize with default values
    this.config = {
      google: {
        clientId: '',
        redirectUri: `${currentOrigin}/oauth2/callback/google`,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid'
      }
    };
    
    console.log('🔑 [OAuthConfig] Google redirect URI:', this.config.google.redirectUri);
  }

  static getInstance(): OAuthConfigService {
    if (!OAuthConfigService.instance) {
      OAuthConfigService.instance = new OAuthConfigService();
    }
    return OAuthConfigService.instance;
  }

  /**
   * Initialize configuration by loading from API
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadConfigFromAPI();
    return this.initPromise;
  }

  private async loadConfigFromAPI(): Promise<void> {
    try {
      console.log('🔄 [OAuthConfig] Loading SSO configuration from API...');
      
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin + '/api';
      const response = await fetch(`${apiUrl}/sso/providers`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const providers: SSOProvider[] = await response.json();
      console.log('📋 [OAuthConfig] Received providers from API:', providers);
      
      // Find Google provider
      const googleProvider = providers.find(p => p.provider === 'google' && p.enabled);
      
      if (googleProvider) {
        this.config.google.clientId = googleProvider.clientId;
        console.log('✅ [OAuthConfig] Google OAuth enabled with Client ID:', 
          googleProvider.clientId.substring(0, 20) + '...');
      } else {
        console.log('⚠️ [OAuthConfig] Google OAuth not configured or disabled');
      }
      
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ [OAuthConfig] Failed to load SSO configuration from API:', error);
      
      // Fallback to environment variables if API fails
      const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (envClientId) {
        this.config.google.clientId = envClientId;
        console.log('🔄 [OAuthConfig] Using fallback Google Client ID from environment');
      }
      
      this.initialized = true;
    }
  }

  async getConfig(): Promise<OAuthConfig> {
    await this.initialize();
    return this.config;
  }

  async validateGoogleConfig(): Promise<boolean> {
    await this.initialize();
    const googleConfig = this.config.google;
    
    if (!googleConfig.clientId) {
      console.error('❌ Google Client ID is not configured');
      return false;
    }

    if (!googleConfig.clientId.endsWith('.apps.googleusercontent.com')) {
      console.error('❌ Invalid Google Client ID format');
      return false;
    }

    return true;
  }

  async isGoogleOAuthEnabled(): Promise<boolean> {
    await this.initialize();
    return !!this.config.google.clientId;
  }
} 