import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { AuthService } from '../services/AuthService';

const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_API_URL}/graphql`,
});

const authLink = setContext((_, { headers }) => {
  const token = AuthService.getAccessToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
  },
}); 