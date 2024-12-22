import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';

const httpLink = createHttpLink({
    uri: `${import.meta.env.VITE_API_URL}/graphql`,
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    }
});

export const apolloClient = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache()
}); 