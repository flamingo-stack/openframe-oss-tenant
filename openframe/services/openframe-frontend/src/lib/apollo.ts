import { ApolloClient, InMemoryCache, from, Observable } from '@apollo/client/core';
import type { FetchResult } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { createHttpLink } from '@apollo/client/link/http';
import { useAuthStore } from '@/stores/auth';

let isRefreshing = false;
let pendingRequests: Function[] = [];

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8080';
};

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

    // Use auth store for cookie-based refresh
    const authStore = useAuthStore.getState();
    console.log('📤 [Auth] Making refresh token request via cookies...');
    const success = await authStore.tryRefreshToken();
    
    if (!success) {
      console.error('❌ [Auth] Token refresh failed');
      throw new Error('Token refresh failed');
    }
    
    console.log('✅ [Auth] Token refresh successful via HTTP-only cookies');
  } catch (error) {
    console.error('❌ [Auth] Token refresh failed:', error);
    throw error;
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
  uri: `${getApiUrl()}/graphql`,
  credentials: 'include', // Always include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  }
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
  link: from([errorLink, httpLink]),
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
      const defaultHeaders = {
        'Accept': '*/*'
      };

      const headers = {
        ...defaultHeaders,
        ...(options.headers || {})
      };

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Always include cookies for authentication
      });

      if (!response.ok) {
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
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data as T;
      } else {
        const text = await response.text();
        return text as T;
      }
    };

    // Handle auth errors with token refresh
    const handleRestAuthError = async <T>(retryCallback: () => Promise<T>): Promise<T> => {
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