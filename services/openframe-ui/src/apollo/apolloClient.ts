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
        await authStore.logout();
        window.location.replace('/login');
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
      } catch (refreshError: any) {
        console.error('❌ [Auth] Token refresh failed:', refreshError);
        // Handle OAuth errors
        if (refreshError.message.includes('Client not found') || 
            refreshError.message.includes('invalid_request') ||
            refreshError.message.includes('invalid_token') ||
            refreshError.message.includes('invalid_grant') ||
            refreshError.message.includes('Unauthorized')) {
          console.log('🚫 [Auth] OAuth error detected, redirecting to login');
          const authStore = useAuthStore();
          await authStore.logout();
          window.location.replace('/login');
          throw refreshError;
        }
        // For any other error, also redirect
        const authStore = useAuthStore();
        await authStore.logout();
        window.location.replace('/login');
        throw refreshError;
      }
    } else {
      console.log('⏳ [Auth] Token refresh in progress, queueing request');
      return new Promise((resolve, reject) => {
        pendingRequests.push(() => {
          retryCallback()
            .then(resolve)
            .catch(async (error: any) => {
              console.error('❌ [Auth] Queued request failed:', error);
              const authStore = useAuthStore();
              await authStore.logout();
              window.location.replace('/login');
              reject(error);
            });
        });
      });
    }
  } catch (error) {
    console.error('❌ [Auth] Token refresh flow failed:', error);
    const authStore = useAuthStore();
    await authStore.logout();
    window.location.replace('/login');
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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('❌ [REST] Request failed:', {
          status: response.status,
          data
        });

        // Handle all OAuth and auth-related errors
        if (response.status === 401 || 
            data.error === 'invalid_request' || 
            data.error === 'invalid_token' ||
            data.error === 'invalid_grant' ||
            data.error_description?.includes('Client not found')) {
          console.log('🔑 [Auth] Auth error detected, handling...');
          
          if (response.status === 401 && !url.includes('/oauth/token')) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              console.error('❌ [Auth] No refresh token available');
              const authStore = useAuthStore();
              await authStore.logout();
              window.location.replace('/login');
              throw new Error('No refresh token available');
            }

            try {
              return await refreshTokenAndRetry(() => this.request<T>(url, options));
            } catch (error) {
              console.error('❌ [Auth] Refresh failed, redirecting to login');
              const authStore = useAuthStore();
              await authStore.logout();
              window.location.replace('/login');
              throw error;
            }
          } else {
            console.error('❌ [Auth] Auth error, redirecting to login');
            const authStore = useAuthStore();
            await authStore.logout();
            window.location.replace('/login');
            throw new Error(data.error_description || 'Authentication failed');
          }
        }
        
        // Create a standardized error object
        const error = new Error() as any;
        error.status = response.status;
        error.name = 'ApiError';

        // Parse error data into a consistent format
        let errorMessage: string;
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error_description) {
          errorMessage = data.error_description;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.map((e: any) => e.reason || e.message).join(', ');
        } else {
          errorMessage = response.statusText;
        }

        error.message = errorMessage;
        error.data = data;
        error.response = {
          status: response.status,
          data: data
        };
        
        throw error;
      }

      console.log('✅ [REST] Request successful');
      const data = await response.json();
      return data as T;
    } catch (error: any) {
      console.error('❌ [REST] Request error:', error);
      // Handle any auth-related error messages
      if (error.message?.includes('Client not found') ||
          error.message?.includes('invalid_request') ||
          error.message?.includes('invalid_token') ||
          error.message?.includes('invalid_grant') ||
          error.message?.includes('Unauthorized') ||
          error.message?.includes('Not authenticated')) {
        console.log('🚫 [Auth] Auth error detected in catch block, redirecting to login');
        const authStore = useAuthStore();
        await authStore.logout();
        window.location.replace('/login');
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