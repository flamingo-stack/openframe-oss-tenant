import { graphql } from 'react-relay';

/**
 * Execution-history list for a single script (v2 — native OpenFrame GraphQL API
 * via Relay). Mirrors the cursor-paginated `scriptExecutions(scriptId, ...)`
 * connection. Status and "Executed by" (initiator) filters plus the free-text
 * `search` are all pushed to the server; the pagination fragment drives infinite
 * scroll.
 */
export const scriptExecutionsRelayQuery = graphql`
  query scriptExecutionsRelayQuery(
    $scriptId: ID!
    $filter: ScriptExecutionFilterInput
    $search: String
    $first: Int!
    $after: String
  ) {
    ...scriptExecutionsRelay_query
      @arguments(scriptId: $scriptId, filter: $filter, search: $search, first: $first, after: $after)
  }
`;

export const scriptExecutionsRelayFragment = graphql`
  fragment scriptExecutionsRelay_query on Query
    @refetchable(queryName: "scriptExecutionsRelayPaginationQuery")
    @argumentDefinitions(
      scriptId: { type: "ID!" }
      filter: { type: "ScriptExecutionFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    scriptExecutions(scriptId: $scriptId, filter: $filter, search: $search, first: $first, after: $after)
      @connection(key: "scriptExecutionsRelay_scriptExecutions") {
      filteredCount
      edges {
        node {
          id
          executionId
          status
          dispatchedAt
          stdout
          stderr
          error
          machine {
            id
            machineId
            hostname
            displayName
            organization {
              id
              name
            }
          }
          initiator {
            id
            firstName
            lastName
            email
            image {
              imageUrl
              hash
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
