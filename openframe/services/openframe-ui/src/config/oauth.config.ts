export interface OAuthConfig {
  google: {
    clientId: string;
    redirectUri: string;
    scope: string;
  };
}

export class OAuthConfigService {
  private static instance: OAuthConfigService;
  private config: OAuthConfig;

  private constructor() {
    // Get the current origin (includes protocol, hostname, and port)
    const currentOrigin = window.location.origin;
    console.log('🔑 [OAuthConfig] Current origin:', currentOrigin);
    console.log('🔑 [OAuthConfig] Current location:', window.location.href);
    console.log('🔑 [OAuthConfig] Environment variables:', {
      VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 
        import.meta.env.VITE_GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
      VITE_API_URL: import.meta.env.VITE_API_URL
    });
    
    this.config = {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        redirectUri: `${currentOrigin}/oauth2/callback/google`,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid'
      }
    };
    
    console.log('🔑 [OAuthConfig] Google redirect URI:', this.config.google.redirectUri);
    console.log('🔑 [OAuthConfig] Google client ID:', this.config.google.clientId ? 
      this.config.google.clientId.substring(0, 20) + '...' : 'MISSING');
  }

  static getInstance(): OAuthConfigService {
    if (!OAuthConfigService.instance) {
      OAuthConfigService.instance = new OAuthConfigService();
    }
    return OAuthConfigService.instance;
  }

  getConfig(): OAuthConfig {
    return this.config;
  }

  validateGoogleConfig(): boolean {
    const googleConfig = this.config.google;
    
    if (!googleConfig.clientId) {
      console.error('❌ Missing VITE_GOOGLE_CLIENT_ID environment variable');
      return false;
    }

    if (!googleConfig.clientId.endsWith('.apps.googleusercontent.com')) {
      console.error('❌ Invalid Google Client ID format');
      return false;
    }

    return true;
  }

  isGoogleOAuthEnabled(): boolean {
    return !!this.config.google.clientId;
  }
} 