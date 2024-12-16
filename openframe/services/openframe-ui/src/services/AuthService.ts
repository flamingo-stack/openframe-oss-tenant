import authConfig from '../config/auth.config';

const API_URL = 'http://localhost:8090';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  firstName?: string;
  lastName?: string;
  confirmPassword: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
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
  private static getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (includeAuth) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    let data: T | ErrorResponse;
    
    try {
      data = await response.json();
    } catch (e) {
      throw new OAuthError(
        'server_error',
        'Failed to parse server response',
        undefined,
        response.status
      );
    }
    
    if (!response.ok) {
      const error = data as ErrorResponse;
      throw OAuthError.fromResponse(response, error);
    }
    
    return data as T;
  }

  private static handleError(error: unknown): never {
    if (error instanceof OAuthError) {
      throw error;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new OAuthError(
        'temporarily_unavailable',
        'Unable to connect to the server',
        undefined,
        503
      );
    }

    throw new OAuthError(
      'server_error',
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      500
    );
  }

  static async login(credentials: LoginCredentials): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: credentials.email,
          password: credentials.password,
          client_id: authConfig.clientId,
          client_secret: authConfig.clientSecret
        })
      });

      const data = await this.handleResponse<TokenResponse>(response);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  static async register(credentials: RegisterCredentials): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_URL}/oauth/register?client_id=${authConfig.clientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          firstName: credentials.firstName,
          lastName: credentials.lastName
        })
      });

      const data = await this.handleResponse<TokenResponse>(response);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: authConfig.clientId,
          client_secret: authConfig.clientSecret
        })
      });

      const data = await this.handleResponse<TokenResponse>(response);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  static async getUserInfo(): Promise<UserInfo> {
    try {
      const response = await fetch(`${API_URL}/.well-known/userinfo`, {
        method: 'GET',
        headers: this.getHeaders(true)
      });

      return this.handleResponse<UserInfo>(response);
    } catch (error: unknown) {
      throw this.handleError(error);
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

      const response = await fetch(`${API_URL}/oauth/authorize?${params}`, {
        method: 'POST',
        headers: this.getHeaders(true)
      });

      const data = await this.handleResponse<{ redirect_url: string }>(response);
      return data.redirect_url;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  static async exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: authConfig.clientId,
          client_secret: authConfig.clientSecret
        })
      });

      const data = await this.handleResponse<TokenResponse>(response);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      return data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  static logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
} 