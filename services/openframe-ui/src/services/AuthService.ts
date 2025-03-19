import authConfig from '../config/auth.config';
import axios from 'axios';
import { config } from '../config/env.config';
import { apolloClient } from '../apollo/apolloClient';
import { gql } from '@apollo/client/core';
import { restClient } from '../apollo/apolloClient';

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
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        // Auto logout if 401 response returned from api
        this.logout();
      }
      
      const error = (data && data.error_description) || response.statusText;
      throw new OAuthError(
        data.error,
        error,
        data.state,
        response.status
      );
    }

    // Store tokens if they exist in response
    if (data.access_token) {
      console.log('🔑 [Auth] Storing access token');
      localStorage.setItem('access_token', data.access_token);
    }
    if (data.refresh_token) {
      console.log('🔑 [Auth] Storing refresh token');
      localStorage.setItem('refresh_token', data.refresh_token);
    }

    // Wait a moment to ensure tokens are stored
    await new Promise(resolve => setTimeout(resolve, 50));

    return data;
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

      const response = await restClient.post<TokenResponse>(`${config.API_URL}/oauth/token`, formData);
      
      console.log('✅ [Auth] Login successful:', {
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        tokenType: response.token_type,
        expiresIn: response.expires_in
      });

      // Store tokens immediately
      if (response.access_token) {
        console.log('🔑 [Auth] Storing access token');
        localStorage.setItem('access_token', response.access_token);
      }
      if (response.refresh_token) {
        console.log('🔑 [Auth] Storing refresh token');
        localStorage.setItem('refresh_token', response.refresh_token);
      }

      // Wait a moment to ensure tokens are stored
      await new Promise(resolve => setTimeout(resolve, 50));

      return response;
    } catch (error: unknown) {
      console.error('❌ [Auth] Login failed:', error);
      throw this.handleError(error);
    }
  }

  static async register(credentials: RegisterCredentials): Promise<TokenResponse> {
    try {
      const data = {
        email: credentials.email,
        password: credentials.password,
        first_name: credentials.firstName || '',
        last_name: credentials.lastName || '',
        confirm_password: credentials.confirmPassword
      };

      const authString = btoa(`${authConfig.clientId}:${authConfig.clientSecret}`);
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authString
      };

      const response = await restClient.post<TokenResponse>(
        `${config.API_URL}/oauth/register`, 
        data,
        { headers }
      );
      
      // Store tokens immediately
      if (response.access_token) {
        console.log('🔑 [Auth] Storing access token');
        localStorage.setItem('access_token', response.access_token);
      }
      if (response.refresh_token) {
        console.log('🔑 [Auth] Storing refresh token');
        localStorage.setItem('refresh_token', response.refresh_token);
      }

      // Wait a moment to ensure tokens are stored
      await new Promise(resolve => setTimeout(resolve, 50));

      return response;
    } catch (error: unknown) {
      throw this.handleError(error);
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

      return await restClient.post<TokenResponse>(`${config.API_URL}/oauth/token`, formData);
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  static async getUserInfo(): Promise<UserInfo> {
    try {
      return await restClient.get<UserInfo>(`${config.API_URL}/.well-known/userinfo`);
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

      const data = await restClient.post<{ redirect_url: string }>(
        `${config.API_URL}/oauth/authorize?${params}`,
        null
      );
      return data.redirect_url;
    } catch (error: unknown) {
      throw this.handleError(error);
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

      return await restClient.post<TokenResponse>(`${config.API_URL}/oauth/token`, formData);
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

  static getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }
} 