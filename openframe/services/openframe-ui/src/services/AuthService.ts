import { authConfig } from '../config/auth.config';
import { ConfigService } from '../config/config.service';
import { restClient } from '../apollo/apolloClient';
import type { 
  TenantDiscoveryResponse, 
  TenantAvailabilityResponse
} from '../types/auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  firstName?: string;
  lastName?: string;
  confirmPassword: string;
  tenantName?: string;
  tenantDomain?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  tenant_domain?: string;
}

export interface UserInfo {
  sub: string;
  name: string;
  email: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
}

export interface ErrorResponse {
  error: string;
  error_description: string;
  state?: string;
}

export type OAuthErrorType = 
  | 'invalid_request'      // The request is missing a required parameter
  | 'invalid_client'       // Client authentication failed
  | 'invalid_grant'        // The provided authorization grant is invalid
  | 'unauthorized_client'  // The client is not authorized
  | 'unsupported_grant_type' // The authorization grant type is not supported
  | 'invalid_scope'        // The requested scope is invalid
  | 'invalid_token'        // The token is invalid or expired
  | 'server_error'         // Internal server error
  | 'temporarily_unavailable'; // The server is temporarily unavailable

export class OAuthError extends Error {
  constructor(
    public error: OAuthErrorType,
    public error_description: string,
    public state?: string,
    public status?: number
  ) {
    super(error_description);
    this.name = 'OAuthError';
  }

  static fromResponse(response: Response, data: ErrorResponse): OAuthError {
    return new OAuthError(
      data.error as OAuthErrorType,
      data.error_description,
      data.state,
      response.status
    );
  }
}

export class AuthService {
  private static configService = ConfigService.getInstance();
  private static runtimeConfig = AuthService.configService.getConfig();

  // Error handling implemented below as a single public static method

  /**
   * Auto-registration that returns an authorization redirect URL.
   * Backend expects camelCase fields and returns { redirect_url }.
   */
  static async registerAuto(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName: string;
    tenantDomain: string;
    pkceChallenge: string;
    redirectUri: string;
  }): Promise<{ redirect_url: string }> {
    try {
      // Backend expects snake_case keys per AutoRegistrationRequest @JsonProperty
      const body = {
        email: payload.email,
        password: payload.password,
        first_name: payload.firstName,
        last_name: payload.lastName,
        tenant_name: payload.tenantName,
        tenant_domain: payload.tenantDomain,
        pkce_challenge: payload.pkceChallenge,
        redirect_uri: payload.redirectUri
      };

      const response = await restClient.post<{ redirect_url: string }>(
        `${import.meta.env.VITE_AUTH_URL}/oauth/register`,
        body
      );

      if (!response?.redirect_url) {
        throw new Error('Invalid register response: redirect_url missing');
      }

      return response;
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }

  static async handleError(error: unknown): Promise<never> {
    if (error instanceof OAuthError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new OAuthError(
        'temporarily_unavailable',
        'Unable to connect to the server. Please check your internet connection.',
        undefined,
        503
      );
    }

    // Handle specific OAuth errors with user-friendly messages
    if (error instanceof Response || (error as any)?.response?.data) {
      const data = (error as any)?.response?.data || await (error as Response).json();
      const errorType = data.error as OAuthErrorType;
      let errorMessage = data.error_description;

      switch (errorType) {
        case 'invalid_grant':
          if (errorMessage.includes('Maximum refresh count reached')) {
            errorMessage = 'Your session has expired. Please log in again.';
          } else if (errorMessage.includes('Invalid credentials')) {
            errorMessage = 'Invalid email or password.';
          }
          break;
        case 'invalid_token':
          errorMessage = 'Your session has expired. Please log in again.';
          break;
        case 'invalid_request':
          errorMessage = 'Invalid request. Please try again.';
          break;
        case 'unauthorized_client':
          errorMessage = 'Application is not authorized. Please contact support.';
          break;
        case 'server_error':
          errorMessage = 'Server error. Please try again later.';
          break;
        case 'temporarily_unavailable':
          errorMessage = 'Service is temporarily unavailable. Please try again later.';
          break;
      }

      throw new OAuthError(
        errorType,
        errorMessage,
        data.state,
        (error as Response)?.status || (error as any)?.response?.status || 500
      );
    }

    throw new OAuthError(
      'server_error',
      error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      undefined,
      500
    );
  }

  static async login(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams({
        grant_type: 'password',
        username: credentials.email,
        password: credentials.password,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret
      });

      console.log('🔑 [Auth] Attempting login with credentials:', {
        email: credentials.email,
        clientId: authConfig.clientId
      });

      const response = await restClient.post<TokenResponse>(`${import.meta.env.VITE_AUTH_URL}/oauth2/token`, formData);
      
      console.log('✅ [Auth] Login successful:', {
        tokenType: response.token_type,
        expiresIn: response.expires_in
      });

      // Tokens are now set as HTTP-only cookies by the server
      console.log('🔑 [Auth] Tokens set as HTTP-only cookies by server');

      return response;
    } catch (error: unknown) {
      console.error('❌ [Auth] Login failed:', error);
      throw await AuthService.handleError(error);
    }
  }

  static async register(credentials: RegisterCredentials): Promise<TokenResponse> {
    try {
      const data = {
        email: credentials.email,
        password: credentials.password,
        first_name: credentials.firstName || '',
        last_name: credentials.lastName || '',
        tenant_name: credentials.tenantName || 'localhost', // Default to localhost for development
        tenant_domain: credentials.tenantDomain || 'localhost' // Default to localhost for development
      };

      const authString = btoa(`${authConfig.clientId}:${authConfig.clientSecret}`);
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authString
      };

      const response = await restClient.post<TokenResponse>(
        `${import.meta.env.VITE_AUTH_URL}/oauth/register`, 
        data,
        { headers }
      );
      
      // Tokens are now set as HTTP-only cookies by the server
      console.log('🔑 [Auth] Registration successful, tokens set as HTTP-only cookies by server');

      return response;
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }

  /**
   * Discover tenants for a given email
   * Used in the returning user flow to show available authentication options
   */
  static async discoverTenants(email: string): Promise<TenantDiscoveryResponse> {
    try {
      const authUrl = import.meta.env.VITE_AUTH_URL;
      const url = `${authUrl}/tenant/discover?email=${encodeURIComponent(email)}`;
      
      console.log('🔍 [Auth] Starting tenant discovery for email:', email);
      console.log('🔍 [Auth] Using URL:', url);
      console.log('🔍 [Auth] VITE_AUTH_URL:', import.meta.env.VITE_AUTH_URL);
      
      const response = await restClient.post<TenantDiscoveryResponse>(url);
      
      console.log('🔍 [Auth] Tenant discovery successful for email:', email);
      console.log('🔍 [Auth] Response:', response);
      return response;
    } catch (error: unknown) {
      console.error('❌ [Auth] Tenant discovery failed:', error);
      throw await AuthService.handleError(error);
    }
  }

  /**
   * Check if a tenant name is available for registration
   */
  static async checkTenantAvailability(tenantName: string): Promise<TenantAvailabilityResponse> {
    try {
      const response = await restClient.get<TenantAvailabilityResponse>(
        `${import.meta.env.VITE_AUTH_URL}/tenant/availability?name=${encodeURIComponent(tenantName)}`
      );
      
      console.log('✅ [Auth] Tenant availability checked for:', tenantName);
      return response;
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }



  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret
      });

      return await restClient.post<TokenResponse>(`${AuthService.runtimeConfig.apiUrl}/oauth2/token`, formData);
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }

  static async getUserInfo(): Promise<UserInfo> {
    try {
      return await restClient.get<UserInfo>(`${AuthService.runtimeConfig.apiUrl}/.well-known/userinfo`);
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }

  static async authorize(redirectUri: string, scope?: string, state?: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: authConfig.clientId,
        redirect_uri: redirectUri,
        ...(scope && { scope }),
        ...(state && { state })
      });

      const data = await restClient.post<{ redirect_url: string }>(
        `${AuthService.runtimeConfig.apiUrl}/oauth/authorize?${params}`,
        null
      );
      return data.redirect_url;
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }

  /**
   * Exchange OAuth2 authorization code for tokens
   * This is the standard OAuth2 flow used by Spring Authorization Server
   */
  static async exchangeCodeForTokens(code: string, state?: string): Promise<TokenResponse> {
    try {
      console.log('🔗 [Auth] Exchanging authorization code for tokens');
      
      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: window.location.origin + window.location.pathname, // Current callback URL
        client_id: import.meta.env.VITE_CLIENT_ID,
        code_verifier: sessionStorage.getItem('pkce:code_verifier') || ''
      });

      if (state) {
        console.log('🔗 [Auth] Including state in token exchange:', state);
      }

      const response = await restClient.post<TokenResponse>(
        `${import.meta.env.VITE_AUTH_URL}/oauth2/token`, 
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('✅ [Auth] Token exchange successful - tokens set as HttpOnly cookies by server');
      return response;
    } catch (error: unknown) {
      console.error('❌ [Auth] Token exchange failed:', error);
      throw await AuthService.handleError(error);
    }
  }

  static async exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret
      });

      return await restClient.post<TokenResponse>(`${AuthService.runtimeConfig.apiUrl}/oauth2/token`, formData);
    } catch (error: unknown) {
      throw await AuthService.handleError(error);
    }
  }

  /**
   * @deprecated Use authStore.logout() instead for proper API logout and cookie clearing
   * This method only clears localStorage and doesn't call the logout API
   */
  static async logout() {
    console.warn('⚠️ [AuthService] DEPRECATED: Use authStore.logout() instead for proper logout');
    
    try {
      // Call logout endpoint to clear HttpOnly cookies
      await fetch(`${AuthService.runtimeConfig.apiUrl}/oauth/logout`, {
        method: 'POST',
        credentials: 'include' // Include cookies
      });
    } catch (error) {
      console.warn('⚠️ [AuthService] Logout endpoint failed, continuing with local logout:', error);
    }
    
    // Clear any localStorage remnants
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    console.log('🔑 [AuthService] DEPRECATED logout completed - consider using authStore.logout()');
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  static getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  static getAuthHeader(): Record<string, string> {
    // No longer returning Authorization header - authentication via cookies
    // Make sure to use credentials: 'include' in fetch requests instead
    return {};
  }

  /**
   * Get Google OAuth2 authorization URL for specific tenant
   */
  public static async getGoogleAuthUrl(tenantId: string, state?: string): Promise<string> {
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_URL || 'http://localhost:9000'}/oauth2/google/authorize/${tenantId}?state=${state || tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to get Google auth URL')
      }

      const data = await response.json()
      return data.authUrl
    } catch (error) {
      console.error('Google auth URL error:', error)
      throw await this.handleError(error)
    }
  }

  /**
   * Initiate Google SSO for login/registration (redirect to Google)
   */
  public static async initiateGoogleSSO(tenantId: string, action: 'login' | 'register' = 'login'): Promise<void> {
    try {
      const state = JSON.stringify({ action, tenantId, provider: 'google' })
      const authUrl = await this.getGoogleAuthUrl(tenantId, state)
      window.location.href = authUrl
    } catch (error) {
      console.error('Google SSO initiation failed:', error)
      throw await this.handleError(error)
    }
  }
} 

export default AuthService;