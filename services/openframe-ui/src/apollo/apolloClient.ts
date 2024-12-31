import { ApolloClient, InMemoryCache, createHttpLink, Observable } from '@apollo/client/core';
import type { FetchResult } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { OAuthError } from '@/errors/OAuthError';
import { useAuthStore } from '../stores/auth';
import { AuthService } from '../services/AuthService';

let isRefreshing = false;
let pendingRequests: Function[] = [];

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
};

const refreshTokenAndRetry = async (retryCallback: () => Promise<any>) => {
  try {
    if (!isRefreshing) {
      console.log('🔄 Starting token refresh flow');
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.error('❌ No refresh token available');
        throw new Error('No refresh token available');
      }

      console.log('📤 Making refresh token request...');
      const response = await AuthService.refreshToken(refreshToken);
      console.log('✅ Token refresh successful');
      localStorage.setItem('access_token', response.access_token);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }

      console.log('🔄 Resolving pending requests:', pendingRequests.length);
      resolvePendingRequests();
      return await retryCallback();
    } else {
      console.log('⏳ Token refresh in progress, queueing request');
      return new Promise((resolve) => {
        pendingRequests.push(() => resolve(retryCallback()));
      });
    }
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    const authStore = useAuthStore();
    await authStore.handleAuthError(error);
    throw error;
  } finally {
    console.log('🏁 Refresh flow complete');
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
  if (networkError) {
    console.error('❌ [Network error]:', networkError);
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      console.log('🚫 GraphQL request received 401, attempting refresh');
      return new Observable(observer => {
        refreshTokenAndRetry(() => 
          new Promise((resolve) => {
            console.log('🔄 Retrying GraphQL operation after token refresh');
            forward(operation).subscribe({
              next: (result) => {
                console.log('✅ GraphQL retry successful');
                resolve(result);
              },
              error: (error) => {
                console.error('❌ GraphQL retry failed:', error);
                observer.error.bind(observer)(error);
              },
              complete: () => {}
            });
          })
        )
        .then(result => {
          observer.next(result);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
      });
    }
  }

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `❌ [GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
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
      console.log('📤 Making REST request to:', url);
      const token = localStorage.getItem('access_token');
      const defaultHeaders = {
        'Accept': '*/*',
        'Authorization': token ? `Bearer ${token}` : ''
      };

      // Merge headers, giving priority to custom headers from options
      const headers = {
        ...defaultHeaders,
        ...(options.headers || {})
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        console.log('🚫 REST request received 401, attempting refresh');
        try {
          return await refreshTokenAndRetry(() => this.request<T>(url, options));
        } catch (error) {
          const authStore = useAuthStore();
          await authStore.handleAuthError(error);
          throw error;
        }
      }

      if (!response.ok) {
        console.error('❌ Request failed:', response.status);
        throw new Error(response.statusText);
      }

      console.log('✅ Request successful');
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('❌ Request error:', error);
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