import axios from 'axios';
import { AuthService } from './AuthService';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add request interceptor
httpClient.interceptors.request.use(
  (config) => {
    // Add auth header if token exists
    const token = AuthService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = AuthService.getRefreshToken();
      if (refreshToken) {
        try {
          const response = await AuthService.refreshToken(refreshToken);
          // Retry original request
          const config = error.config;
          config.headers.Authorization = `Bearer ${response.access_token}`;
          return httpClient(config);
        } catch (e) {
          AuthService.logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
      AuthService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default httpClient; 