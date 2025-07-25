import { GraphQLClient } from 'graphql-request'

// No auth headers needed - cookies handle authentication
export const graphqlClient = new GraphQLClient('/api/graphql', {
  credentials: 'include' // Include HTTP-only cookies
})

export const useGraphQLClient = () => graphqlClient