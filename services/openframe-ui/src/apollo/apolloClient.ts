import { ApolloClient, InMemoryCache, from, Observable } from '@apollo/client/core';
import type { FetchResult } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { createHttpLink } from '@apollo/client/link/http';
import { useAuthStore } from '@/stores/auth';
import { AuthService } from '@/services/AuthService';

let isRefreshing = false;
let pendingRequests: Function[] = [];

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
};

const refreshTokenAndRetry = async (retryCallback: () => Promise<any>) => {
  try {
    if (!isRefreshing) {
      console.log('🔄 [Auth] Starting token refresh flow');
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.error('❌ [Auth] No refresh token available');
        const authStore = useAuthStore();
        authStore.logout();
        window.location.href = '/login';
        throw new Error('No refresh token available');
      }

      try {
        console.log('📤 [Auth] Making refresh token request...');
        const response = await AuthService.refreshToken(refreshToken);
        console.log('✅ [Auth] Token refresh successful');
        localStorage.setItem('access_token', response.access_token);
        if (response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }

        console.log('🔄 [Auth] Resolving pending requests:', pendingRequests.length);
        resolvePendingRequests();
        return await retryCallback();
      } catch (refreshError) {
        console.error('❌ [Auth] Token refresh failed:', refreshError);
        const authStore = useAuthStore();
        authStore.logout();
        window.location.href = '/login';
        throw refreshError;
      }
    } else {
      console.log('⏳ [Auth] Token refresh in progress, queueing request');
      return new Promise((resolve, reject) => {
        pendingRequests.push(() => {
          retryCallback()
            .then(resolve)
            .catch((error) => {
              if (error?.response?.status === 401 || 
                  (error instanceof Error && error.message.includes('Unauthorized'))) {
                console.error('❌ [Auth] Queued request failed with 401');
                const authStore = useAuthStore();
                authStore.logout();
                window.location.href = '/login';
              }
              reject(error);
            });
        });
      });
    }
  } catch (error) {
    console.error('❌ [Auth] Token refresh flow failed:', error);
    const authStore = useAuthStore();
    authStore.logout();
    window.location.href = '/login';
    throw error;
  } finally {
    console.log('🏁 [Auth] Refresh flow complete');
    isRefreshing = false;
  }
};

const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_API_URL}/graphql`,
});

const authLink = setContext(async (_, { headers }) => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.error('🔴 [GraphQL] Error:', err);
      
      // Check for unauthorized error
      if (err.extensions?.code === 'UNAUTHENTICATED' || 
          err.message.includes('Unauthorized') ||
          err.message.includes('unauthorized')) {
        console.log('🔑 [Auth] GraphQL unauthorized error detected');
        
        // If we're already on the login page, don't try to refresh
        if (window.location.pathname === '/login') {
          console.log('⏩ [Auth] Already on login page, skipping refresh');
          return;
        }

        return new Observable<FetchResult>(observer => {
          refreshTokenAndRetry(async () => {
            try {
              const result = await new Promise<FetchResult>((resolve, reject) => {
                forward(operation).subscribe({
                  next: resolve,
                  error: reject,
                  complete: () => {}
                });
              });
              observer.next(result);
              observer.complete();
              return result;
            } catch (error) {
              console.error('❌ [Auth] GraphQL retry failed:', error);
              const authStore = useAuthStore();
              authStore.logout();
              window.location.href = '/login';
              observer.error(error);
              throw error;
            }
          });
        });
      }
    }
  }

  if (networkError) {
    console.error('🔴 [Network] Error:', networkError);
    // Check for 401 status in different network error types
    const isUnauthorized = 
      ('statusCode' in networkError && networkError.statusCode === 401) ||
      networkError.message.includes('401') ||
      networkError.message.includes('Unauthorized');

    if (isUnauthorized) {
      console.log('🔑 [Auth] Network unauthorized error detected');
      
      // If we're already on the login page, don't try to refresh
      if (window.location.pathname === '/login') {
        console.log('⏩ [Auth] Already on login page, skipping refresh');
        return;
      }

      return new Observable<FetchResult>(observer => {
        refreshTokenAndRetry(async () => {
          try {
            const result = await new Promise<FetchResult>((resolve, reject) => {
              forward(operation).subscribe({
                next: resolve,
                error: reject,
                complete: () => {}
              });
            });
            observer.next(result);
            observer.complete();
            return result;
          } catch (error) {
            console.error('❌ [Auth] Network retry failed:', error);
            const authStore = useAuthStore();
            authStore.logout();
            window.location.href = '/login';
            observer.error(error);
            throw error;
          }
        });
      });
    }
  }
});

export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
});

// REST client with token refresh
export const restClient = {
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      console.log('📤 [REST] Making request to:', url);
      const token = localStorage.getItem('access_token');
      const defaultHeaders = {
        'Accept': '*/*',
        'Authorization': token ? `Bearer ${token}` : ''
      };

      const headers = {
        ...defaultHeaders,
        ...(options.headers || {})
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        console.log('🔑 [Auth] REST request received 401, attempting refresh');
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          console.error('❌ [Auth] No refresh token available for REST request');
          const authStore = useAuthStore();
          authStore.logout();
          window.location.href = '/login';
          throw new Error('No refresh token available');
        }

        try {
          return await refreshTokenAndRetry(() => this.request<T>(url, options));
        } catch (error) {
          console.error('❌ [Auth] REST refresh token failed:', error);
          const authStore = useAuthStore();
          authStore.logout();
          window.location.href = '/login';
          throw error;
        }
      }

      if (!response.ok) {
        console.error('❌ [REST] Request failed:', response.status);
        throw new Error(response.statusText);
      }

      console.log('✅ [REST] Request successful');
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('❌ [REST] Request error:', error);
      if (error instanceof Error && 
          (error.message.includes('Unauthorized') || 
           error.message.includes('Not authenticated') || 
           error.message.includes('Failed to extract email from token'))) {
        const authStore = useAuthStore();
        authStore.logout();
        window.location.href = '/login';
      }
      throw error;
    }
  },

  get<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  },
  
  post<T>(url: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    const isFormData = data instanceof URLSearchParams;
    const headers = {
      'Content-Type': isFormData ? 'application/x-www-form-urlencoded' : 'application/json',
      ...(options.headers || {})
    };

    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: isFormData ? data.toString() : JSON.stringify(data),
      headers
    });
  },
  
  patch<T>(url: string, data: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  delete<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}; 