import authConfig from '../config/auth.config';
import axios from 'axios';
import { config } from '../config/env.config';
import { apolloClient } from '../apollo/apolloClient';
import { gql } from '@apollo/client/core';

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
      localStorage.setItem('access_token', data.access_token);
    }
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }

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
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', credentials.email);
    params.append('password', credentials.password);
    params.append('client_id', authConfig.clientId);
    params.append('client_secret', authConfig.clientSecret);

    const response = await fetch(`${config.API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Login failed');
    }

    const tokenResponse = await response.json();
    
    localStorage.setItem('access_token', tokenResponse.access_token);
    localStorage.setItem('refresh_token', tokenResponse.refresh_token);
    
    return tokenResponse;
  }

  static async register(credentials: RegisterCredentials): Promise<TokenResponse> {
    try {
      const response = await fetch(`${config.API_URL}/oauth/register?client_id=${authConfig.clientId}`, {
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
      const response = await fetch(`${config.API_URL}/oauth/token`, {
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
      const response = await fetch(`${config.API_URL}/.well-known/userinfo`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      return response.json();
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

      const response = await fetch(`${config.API_URL}/oauth/authorize?${params}`, {
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
      const response = await fetch(`${config.API_URL}/oauth/token`, {
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

  static getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }
} 