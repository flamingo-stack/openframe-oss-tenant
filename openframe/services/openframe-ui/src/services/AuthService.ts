import authConfig from '../config/auth.config';

const API_URL = 'http://localhost:8090';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

interface ErrorResponse {
  message: string;
  status: number;
  error: string;
}

export class AuthService {
  static async login(credentials: LoginCredentials) {
    const response = await fetch(`${API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: credentials.email,
        password: credentials.password,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret
      })
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data;
  }

  static async register(credentials: RegisterCredentials) {
    const response = await fetch(`${API_URL}/oauth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        client_id: authConfig.clientId
      })
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    return response.json();
  }

  static logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
} 