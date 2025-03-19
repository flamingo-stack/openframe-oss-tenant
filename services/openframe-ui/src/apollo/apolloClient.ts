import { ApolloClient, InMemoryCache, from, Observable } from '@apollo/client/core';
import type { FetchResult } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { createHttpLink } from '@apollo/client/link/http';
import { useAuthStore } from '@/stores/auth';
import { AuthService } from '@/services/AuthService';
import router from '@/router';
import type { IntegratedTool, ToolUrlType, APIKeyType } from '@/types/graphql';

let isRefreshing = false;
let pendingRequests: Function[] = [];

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
};

// Centralized auth error detection
const isAuthError = (error: any): boolean => {
  // Check error message
  const isAuthErrorMessage = error?.message?.includes('Client not found') ||
    error?.message?.includes('invalid_request') ||
    error?.message?.includes('invalid_token') ||
    error?.message?.includes('invalid_grant') ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Not authenticated');

  // Check error response
  const isAuthErrorResponse = error?.response?.status === 401 ||
    error?.response?.data?.error === 'invalid_request' ||
    error?.response?.data?.error === 'invalid_token' ||
    error?.response?.data?.error === 'invalid_grant' ||
    error?.response?.data?.error_description?.includes('Client not found');

  return isAuthErrorMessage || isAuthErrorResponse;
};

// Core token refresh logic
const refreshAccessToken = async (): Promise<void> => {
  try {
    // If we're already on the login page, don't try to refresh
    if (window.location.pathname === '/login') {
      console.log('⏩ [Auth] Already on login page, skipping refresh');
      throw new Error('Already on login page');
    }

    // Get refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.error('❌ [Auth] No refresh token available');
      throw new Error('No refresh token available');
    }

    console.log('📤 [Auth] Making refresh token request...');
    const response = await AuthService.refreshToken(refreshToken);
    console.log('✅ [Auth] Token refresh successful');
    
    localStorage.setItem('access_token', response.access_token);
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token);
    }
  } catch (error) {
    console.error('❌ [Auth] Token refresh failed:', error);
    const authStore = useAuthStore();
    await authStore.logout();
    router.push('/login');
    throw error;
  }
};

// Handle auth errors for REST requests
const handleRestAuthError = async <T>(retryCallback: () => Promise<T>): Promise<T> => {
  // Handle concurrent refresh requests
  if (!isRefreshing) {
    console.log('🔄 [Auth] Starting token refresh flow');
    isRefreshing = true;

    try {
      await refreshAccessToken();
      console.log('🔄 [Auth] Resolving pending requests:', pendingRequests.length);
      resolvePendingRequests();
      return await retryCallback();
    } finally {
      console.log('🏁 [Auth] Refresh flow complete');
      isRefreshing = false;
    }
  } else {
    console.log('⏳ [Auth] Token refresh in progress, queueing request');
    return new Promise((resolve, reject) => {
      pendingRequests.push(() => {
        retryCallback().then(resolve).catch(reject);
      });
    });
  }
};

// Handle auth errors for GraphQL requests
const handleGraphQLAuthError = (operation: any, forward: any): Observable<FetchResult> => {
  return new Observable(observer => {
    const retry = async () => {
      try {
        if (!isRefreshing) {
          console.log('🔄 [Auth] Starting token refresh flow');
          isRefreshing = true;

          try {
            await refreshAccessToken();
            console.log('🔄 [Auth] Resolving pending requests:', pendingRequests.length);
            resolvePendingRequests();
          } finally {
            console.log('🏁 [Auth] Refresh flow complete');
            isRefreshing = false;
          }
        } else {
          console.log('⏳ [Auth] Token refresh in progress, queueing request');
          await new Promise(resolve => {
            pendingRequests.push(resolve);
          });
        }

        const result = await new Promise<FetchResult>((resolve, reject) => {
          forward(operation).subscribe({
            next: resolve,
            error: reject,
            complete: () => {}
          });
        });

        observer.next(result);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    };

    retry();
    return () => {}; // Cleanup function
  });
};

const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_API_URL}/graphql`
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

// GraphQL error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.error('🔴 [GraphQL] Error:', err);
      
      if (err.extensions?.code === 'UNAUTHENTICATED' || 
          err.message.includes('Unauthorized') ||
          err.message.includes('unauthorized')) {
        return handleGraphQLAuthError(operation, forward);
      }
    }
  }

  if (networkError) {
    console.error('🔴 [Network] Error:', networkError);
    if (isAuthError(networkError)) {
      return handleGraphQLAuthError(operation, forward);
    }
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      IntegratedTool: {
        keyFields: ['id'],
        fields: {
          toolUrls: {
            merge: false
          },
          credentials: {
            merge: true
          }
        }
      }
    }
  }),
  connectToDevTools: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      nextFetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

// Clear cache on startup
apolloClient.clearStore();

export default apolloClient;

// REST client with centralized error handling
export const restClient = {
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const makeRequest = async () => {
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
        // For error responses, get the text content
        const errorText = await response.text();
        
        console.error('❌ [REST] Request failed:', {
          status: response.status,
          data: errorText
        });

        const error = new Error() as any;
        error.status = response.status;
        error.name = 'ApiError';
        error.response = { 
          status: response.status, 
          data: errorText 
        };
        error.message = errorText || response.statusText;
        
        throw error;
      }

      console.log('✅ [REST] Request successful');
      const data = await response.json();
      console.log('📦 [REST] Response data:', data);
      return data as T;
    };

    try {
      return await makeRequest();
    } catch (error: any) {
      console.error('❌ [REST] Request error:', error);
      
      // Handle auth errors with token refresh
      if (isAuthError(error)) {
        return await handleRestAuthError(makeRequest);
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
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  },
  
  put<T>(url: string, data: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  },
  
  delete<T>(url: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}; 