import axios from 'axios'
import environment from '../config/environment'

const API_URL = environment.apiUrl

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/oauth/token`, new URLSearchParams({
      'grant_type': 'password',
      'username': email,
      'password': password,
      'client_id': 'test_client',
      'client_secret': 'test_secret'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data
  }

  static async register(email: string, password: string): Promise<any> {
    const response = await axios.post(`${API_URL}/oauth/register`, new URLSearchParams({
      'email': email,
      'password': password,
      'client_id': 'test_client'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data
  }
} 