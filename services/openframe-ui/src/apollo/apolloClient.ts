import { ApolloClient, InMemoryCache, createHttpLink, Observable } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { OAuthError } from '../errors/OAuthError';
import { useAuthStore } from '../stores/auth';
import { AuthService } from '../services/AuthService';

let isRefreshing = false;
let pendingRequests: Function[] = [];

const resolvePendingRequests = () => {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
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

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
    if (!isRefreshing) {
      isRefreshing = true;

      return new Observable(observer => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          const authStore = useAuthStore();
          authStore.logout();
          observer.error(new Error('No refresh token available'));
          return;
        }

        AuthService.refreshToken(refreshToken)
          .then(response => {
            localStorage.setItem('access_token', response.access_token);
            if (response.refresh_token) {
              localStorage.setItem('refresh_token', response.refresh_token);
            }

            operation.setContext(({ headers = {} }) => ({
              headers: {
                ...headers,
                authorization: `Bearer ${response.access_token}`,
              },
            }));

            resolvePendingRequests();
            forward(operation).subscribe(observer);
          })
          .catch(error => {
            const authStore = useAuthStore();
            authStore.handleAuthError(error);
            observer.error(error);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    } else {
      return new Observable(observer => {
        pendingRequests.push(() => {
          forward(operation).subscribe(observer);
        });
      });
    }
  }
});

export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
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

// REST client with error handling
export const restClient = {
  async request(url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...getAuthHeaders(),
        },
      });

      if (response.status === 401) {
        const authStore = useAuthStore();
        await authStore.handleAuthError(
          new OAuthError(
            'invalid_token',
            'Session expired. Please log in again.',
            undefined,
            401
          )
        );
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  get(url: string) {
    return this.request(url);
  },
  
  post(url: string, data: unknown) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  patch(url: string, data: unknown) {
    return this.request(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  delete(url: string) {
    return this.request(url, {
      method: 'DELETE'
    });
  }
}; 