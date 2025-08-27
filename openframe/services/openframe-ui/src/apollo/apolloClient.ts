import { ApolloClient, InMemoryCache, from, Observable } from '@apollo/client/core';
import type { FetchResult } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { getAccessToken } from '@/services/token-storage';
import { createHttpLink } from '@apollo/client/link/http';
import { useAuthStore } from '@/stores/auth';
// import type { IntegratedTool, ToolUrlType, APIKeyType } from '@/types/graphql';
import { ConfigService } from '@/config/config.service';
import { fetchWithAuth } from '@/services/ApiService';

let isRefreshing = false;
let pendingRequests: Function[] = [];
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown between refresh attempts
const config = ConfigService.getInstance();
// One-shot refresh guard per URL (normalized without query)
const retriedOnce = new Set<string>();

// Log configuration for debugging
console.log('🔧 [ApolloClient] Configuration:', {
  apiUrl: config.getConfig().apiUrl,
  gatewayUrl: config.getConfig().gatewayUrl
});

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

  // Check error response (for both fetch and axios-style errors)
  const isAuthErrorResponse = error?.status === 401 || // fetch API
    error?.response?.status === 401 || // axios-style
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
    const authStore = useAuthStore();
    console.log('📤 [Auth] Making refresh token request via cookies...');
    await authStore.refreshToken();
    console.log('✅ [Auth] Token refresh successful via HTTP-only cookies');
  } catch (error) {
    console.error('❌ [Auth] Token refresh failed:', error);
    // Don't automatically logout here - let the calling code decide
    // This prevents unexpected logouts during normal API operations
    throw error;
  }
};

// Handle auth errors for REST requests
const handleRestAuthError = async <T>(retryCallback: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  
  // Check cooldown to prevent too frequent refresh attempts
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN) {
    console.log('⏰ [Auth] Refresh cooldown active, skipping refresh attempt');
    throw new Error('Token refresh cooldown active');
  }
  
  // Handle concurrent refresh requests
  if (!isRefreshing) {
    console.log('🔄 [Auth] Starting token refresh flow');
    isRefreshing = true;
    lastRefreshAttempt = now;

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
  uri: `${config.getConfig().apiUrl}/graphql`,
  credentials: 'include', // Always include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  }
});

// Attach access token header for local-dev mode when backend sent tokens as headers
const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();
  if (token) {
    return {
      headers: {
        ...headers,
        'Access-Token': token
      }
    };
  }
  return { headers };
});

// GraphQL error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.error('🔴 [GraphQL] Error:', err);

      if (err.extensions?.code === 'UNAUTHENTICATED' ||
          err.message.includes('Unauthorized') ||
          err.message.includes('unauthorized')) {
        const ctx = operation.getContext() || {};
        if (ctx.noRefresh) {
          console.log('🚫 [GraphQL] noRefresh context set, skipping refresh to avoid loop');
          return;
        }
        operation.setContext({ ...ctx, noRefresh: true });
        return handleGraphQLAuthError(operation, forward);
      }
    }
  }

  if (networkError) {
    console.error('🔴 [Network] Error:', networkError);
    if (isAuthError(networkError)) {
      const ctx = operation.getContext() || {};
      if (ctx.noRefresh) {
        console.log('🚫 [GraphQL] noRefresh context set (network), skipping refresh to avoid loop');
        return;
      }
      operation.setContext({ ...ctx, noRefresh: true });
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
             // Determine the base URL based on the endpoint
             let baseUrl: string;
             if (url.startsWith('/oauth/')) {
               // OAuth endpoints go to Gateway (BFF)
               baseUrl = config.getConfig().gatewayUrl;
             } else if (
               url.startsWith('/register') ||
               url.startsWith('/oauth2/') ||
               url.startsWith('/tenant/') ||
               url.startsWith('/oauth/') ||
               url.startsWith('/sas/')
             ) {
               // All Authorization Server endpoints now go through Gateway with /sas prefix
               baseUrl = config.getConfig().gatewayUrl;
               // Ensure /sas prefix is present for Auth Server calls
               if (url.startsWith('/tenant/') || url.startsWith('/oauth2/') || url.startsWith('/register')) {
                 url = `/sas${url}`;
               }
             } else {
               // Default to API URL
               baseUrl = config.getConfig().apiUrl;
             }

      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      
      console.log('🌐 [REST] Request:', {
        originalUrl: url,
        baseUrl,
        fullUrl,
        endpoint: url.startsWith('/oauth/') ? 'Gateway' : 
                  url.startsWith('/sas/') ? 'Auth Server via Gateway' : 'API',
        method: options.method || 'GET',
        config: {
          apiUrl: config.getConfig().apiUrl,
          gatewayUrl: config.getConfig().gatewayUrl
        }
      });
      
      const defaultHeaders = {
        'Accept': '*/*'
        // No longer adding Authorization header - authentication via cookies
      };

      const headers = {
        ...defaultHeaders,
        ...(options.headers || {})
      };

      const response = await fetchWithAuth(fullUrl, {
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
        error.status = response.status; // This is what isAuthError checks for
        error.name = 'ApiError';
        error.response = { 
          status: response.status, 
          data: errorText 
        };
        error.message = errorText || response.statusText;
        
        // Log if this is an auth error for debugging
        if (response.status === 401) {
          console.log('🔐 [REST] 401 Unauthorized detected, will trigger token refresh');
        }
        
        throw error;
      }

      console.log('✅ [REST] Request successful');
      // Clear retry guard for this URL on success
      try { retriedOnce.delete(url.split('?')[0]); } catch {}
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log('📦 [REST] Response data: (empty)');
        return undefined as T;
      }
      
      const contentType = response.headers.get('content-type');
      // Capture dev-headers for rotated tokens (localhost dev)
      try {
        const newAccess = response.headers.get('Access-Token');
        const newRefresh = response.headers.get('Refresh-Token');
        if (newAccess) {
          const { setTokens } = await import('@/services/token-storage');
          setTokens({ accessToken: newAccess, refreshToken: newRefresh || undefined });
        }
      } catch {}

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('📦 [REST] Response data (JSON):', data);
        return data as T;
      } else {
        const text = await response.text();
        console.log('📦 [REST] Response data (text):', text);
        return text as T;
      }
    };

    try {
      return await makeRequest();
    } catch (error: any) {
      console.error('❌ [REST] Request error:', error);

      // Don't attempt refresh for oauth endpoints to prevent infinite loops
      if (url.includes('/oauth/refresh') || url.includes('/oauth/login') || url.includes('/oauth/logout')) {
        console.log('🚫 [REST] OAuth endpoint detected, skipping token refresh to prevent loops');
        throw error;
      }

      // Prevent refresh loop: if this request already retried once with x-no-refresh, don't refresh again
      const noRefresh = (options.headers as any)?.['x-no-refresh'] === '1';
      const key = (() => { try { return url.split('?')[0]; } catch { return url; } })();

      // Handle auth errors with single refresh attempt per request
      if (isAuthError(error) && !noRefresh) {
        if (retriedOnce.has(key)) {
          console.log('🚫 [REST] Already retried once for', key, '— skipping refresh to avoid loop');
          throw error;
        }
        retriedOnce.add(key);
        console.log('🔄 [REST] Auth error detected, attempting token refresh for', key, '...');
        return await handleRestAuthError(() => {
          const retryOpts: RequestInit = {
            ...options,
            headers: { ...(options.headers || {}), 'x-no-refresh': '1' }
          };
          return restClient.request<T>(url, retryOpts);
        });
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
