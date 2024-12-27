import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { config } from '../config/env.config';
import { onError } from "@apollo/client/link/error";
import router from '../router';

// Create the http link
const httpLink = createHttpLink({
  uri: `${config.API_URL}/graphql`,
  credentials: 'include', // Important for CORS
});

// Add the auth header to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('access_token');
  
  const updatedHeaders = {
    ...headers,
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };
  
  return { headers: updatedHeaders };
});

// Add auth error handling
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
    // Clear auth tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Redirect to login
    router.push('/login');
    return;
  }
  
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  if (networkError) console.error(`[Network error]: ${networkError}`);
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

// Add REST methods
export const restClient = {
  async get(url: string) {
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || response.statusText) as ResponseError;
      error.response = { status: response.status, statusText: response.statusText, data };
      throw error;
    }
    return data;
  },
  
  async post(url: string, data: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const responseData = await response.json();
    if (!response.ok) {
      const error = new Error(responseData.message || response.statusText) as ResponseError;
      error.response = { status: response.status, statusText: response.statusText, data: responseData };
      throw error;
    }
    return responseData;
  },
  
  async patch(url: string, data: unknown) {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const responseData = await response.json();
    if (!response.ok) {
      const error = new Error(responseData.message || response.statusText) as ResponseError;
      error.response = { status: response.status, statusText: response.statusText, data: responseData };
      throw error;
    }
    return responseData;
  },
  
  async delete(url: string) {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || response.statusText) as ResponseError;
      error.response = { status: response.status, statusText: response.statusText, data };
      throw error;
    }
    return data;
  }
}; 