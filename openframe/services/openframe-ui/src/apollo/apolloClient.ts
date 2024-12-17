import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';
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
  
  // More detailed debug logging
  console.log('Apollo Auth Link - Headers before:', headers);
  console.log('Apollo Auth Link - Token exists:', !!token);
  
  const updatedHeaders = {
    ...headers,
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };
  
  console.log('Apollo Auth Link - Final headers:', updatedHeaders);
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