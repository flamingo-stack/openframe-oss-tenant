import { ApolloClient, InMemoryCache, from, Observable } from '@apollo/client/core';
import type { FetchResult } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { createHttpLink } from '@apollo/client/link/http';
import { useAuthStore } from '../hooks/useAuth';

let isRefreshing = false;
let pendingRequests: Function[] = [];

const getConfig = () => ({
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080'
});

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
};

// Centralized auth error detection
const isAuthError = (error: any): boolean => {
  const isAuthErrorMessage = error?.message?.includes('Client not found') ||
    error?.message?.includes('invalid_request') ||
    error?.message?.includes('invalid_token') ||
    error?.message?.includes('invalid_grant') ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Not authenticated');

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
    if (window.location.pathname === '/login') {
      console.log('⏩ [Auth] Already on login page, skipping refresh');
      throw new Error('Already on login page');
    }

    console.log('📤 [Auth] Making refresh token request via cookies...');
    const success = await useAuthStore.getState().tryRefreshToken();
    
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

const config = getConfig();
const httpLink = createHttpLink({
  uri: `${config.apiUrl}/graphql`,
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