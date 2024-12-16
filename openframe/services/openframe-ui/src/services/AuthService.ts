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
}

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface ErrorResponse {
  message: string;
  status: number;
  error: string;
}

export class AuthService {
  private static getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
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
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }
    return response.json();
  }

  static async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/oauth/token`, {
      method: 'POST',
      headers: this.getHeaders(),
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
  }

  static async register(credentials: RegisterCredentials): Promise<void> {
    const endpoint = credentials.firstName || credentials.lastName ? 
      '/oauth/register/full' : '/oauth/register';

    if (endpoint === '/oauth/register/full') {
      const response = await fetch(`${API_URL}${endpoint}?client_id=${authConfig.clientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          firstName: credentials.firstName,
          lastName: credentials.lastName
        })
      });

      await this.handleResponse<void>(response);
    } else {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: new URLSearchParams({
          email: credentials.email,
          password: credentials.password,
          client_id: authConfig.clientId
        })
      });

      await this.handleResponse<void>(response);
    }
  }

  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/oauth/token`, {
      method: 'POST',
      headers: this.getHeaders(),
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
  }

  static async getUserInfo(): Promise<UserInfo> {
    const response = await fetch(`${API_URL}/oauth/userinfo`, {
      method: 'GET',
      headers: this.getHeaders(true)
    });

    return this.handleResponse<UserInfo>(response);
  }

  static async authorize(redirectUri: string, scope?: string, state?: string): Promise<string> {
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
  }

  static async exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/oauth/token`, {
      method: 'POST',
      headers: this.getHeaders(),
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