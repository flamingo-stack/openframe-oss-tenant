import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, fromPromise, Observable } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { config } from '../config/env.config';
import { onError } from "@apollo/client/link/error";
import router from '../router';
import authConfig from '../config/auth.config';
import { useAuthStore } from '../stores/auth';

// Create the http link
const httpLink = createHttpLink({
  uri: `${config.API_URL}/graphql`,
  credentials: 'include',
});

let isRefreshing = false;
let pendingRequests: Function[] = [];

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
};

const getNewToken = async () => {
  console.log('🔄 Attempting to refresh token...');
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    console.error('❌ No refresh token available');
    throw new Error('No refresh token available');
  }

  try {
    console.log('📤 Making refresh token request...');
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    formData.append('client_id', authConfig.clientId);
    formData.append('client_secret', authConfig.clientSecret);

    const response = await fetch(`${config.API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Token refresh failed:', errorData);
      throw new Error(errorData.error_description || 'Token refresh failed');
    }

    const data = await response.json();
    console.log('✅ Token refresh successful');
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token;
  } catch (err) {
    console.error('❌ Token refresh error:', err);
    // Clear tokens and redirect to login
    const authStore = useAuthStore();
    await authStore.handleLogout();
    throw err;
  }
};

// Add the auth header to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token');
  console.log('🔑 Adding auth header to request:', token ? 'Token present' : 'No token');
  
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      'Accept': '*/*'
    }
  };
});

// Add auth error handling with token refresh
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
    console.log('🚫 Received 401 error, current refresh state:', { isRefreshing });
    
    if (!isRefreshing) {
      console.log('🔄 Starting token refresh flow');
      isRefreshing = true;
      
      return new Observable(observer => {
        getNewToken()
          .then((token) => {
            console.log('🔄 Token refreshed, updating operation context');
            operation.setContext(({ headers = {} }) => ({
              headers: {
                ...headers,
                Authorization: `Bearer ${token}`,
              },
            }));
            
            console.log('✅ Resolving pending requests:', pendingRequests.length);
            resolvePendingRequests();
            forward(operation).subscribe(observer);
          })
          .catch((error) => {
            console.error('❌ Token refresh failed:', error);
            pendingRequests = [];
            const authStore = useAuthStore();
            authStore.handleLogout();
            observer.error(error);
          })
          .finally(() => {
            console.log('🏁 Refresh flow complete');
            isRefreshing = false;
          });
      });
    } else {
      console.log('⏳ Token refresh in progress, queueing request');
      return new Observable(observer => {
        pendingRequests.push(() => {
          forward(operation).subscribe(observer);
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
  if (networkError) console.error(`❌ [Network error]:`, networkError);
});

// Create the Apollo Client instance
export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          integratedTools: {
            merge: false
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    },
  },
});

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };
};

interface ResponseError extends Error {
  response?: {
    status: number;
    statusText: string;
    data: any;
  };
}

// Add REST methods with token refresh
export const restClient = {
  async request(url: string, options: RequestInit = {}) {
    try {
      console.log('📤 Making REST request to:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...getAuthHeaders(),
        },
      });

      if (response.status === 401) {
        console.log('🚫 REST request received 401, attempting refresh');
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const formData = new URLSearchParams();
          formData.append('grant_type', 'refresh_token');
          formData.append('refresh_token', refreshToken);
          formData.append('client_id', authConfig.clientId);
          formData.append('client_secret', authConfig.clientSecret);

          const refreshResponse = await fetch(`${config.API_URL}/oauth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
          });

          if (!refreshResponse.ok) {
            const errorData = await refreshResponse.json();
            console.error('❌ Token refresh failed:', errorData);
            throw new Error(errorData.error_description || 'Token refresh failed');
          }

          const data = await refreshResponse.json();
          localStorage.setItem('access_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }

          console.log('🔄 Token refreshed, retrying original request');
          // Retry the original request with new token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              ...getAuthHeaders(),
            },
          });
          
          if (!retryResponse.ok) {
            console.error('❌ Retry request failed:', retryResponse.status);
            const data = await retryResponse.json();
            const error = new Error(data.message || retryResponse.statusText) as ResponseError;
            error.response = { status: retryResponse.status, statusText: retryResponse.statusText, data };
            throw error;
          }
          
          console.log('✅ Retry request successful');
          return retryResponse.json();
        } catch (refreshError: any) {
          console.error('❌ REST refresh flow failed:', refreshError);
          const authStore = useAuthStore();
          await authStore.handleLogout();
          throw refreshError;
        }
      }

      if (!response.ok) {
        console.error('❌ Request failed:', response.status);
        const data = await response.json();
        const error = new Error(data.message || response.statusText) as ResponseError;
        error.response = { status: response.status, statusText: response.statusText, data };
        throw error;
      }

      console.log('✅ Request successful');
      return response.json();
    } catch (error) {
      console.error('❌ Request error:', error);
      throw error;
    }
  },

  async get(url: string) {
    return this.request(url);
  },
  
  async post(url: string, data: unknown) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  async patch(url: string, data: unknown) {
    return this.request(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  async delete(url: string) {
    return this.request(url, {
      method: 'DELETE'
    });
  }
}; 