import { graphql } from 'react-relay';

/**
 * Execution-history list for a single script (v2 — native OpenFrame GraphQL API
 * via Relay). Mirrors the cursor-paginated `scriptExecutions(scriptId, ...)`
 * connection. The status filter is pushed to the server (`ScriptExecutionFilterInput.statuses`);
 * the pagination fragment drives infinite scroll.
 *
 * The schema's filter input only exposes `statuses` and `initiatorIds`, and the
 * connection has no `search` argument — so only the Status column is a server
 * filter here (Device / Executed by stay display-only).
 */
export const scriptExecutionsRelayQuery = graphql`
  query scriptExecutionsRelayQuery(
    $scriptId: ID!
    $filter: ScriptExecutionFilterInput
    $first: Int!
    $after: String
  ) {
    ...scriptExecutionsRelay_query
      @arguments(scriptId: $scriptId, filter: $filter, first: $first, after: $after)
  }
`;

export const scriptExecutionsRelayFragment = graphql`
  fragment scriptExecutionsRelay_query on Query
    @refetchable(queryName: "scriptExecutionsRelayPaginationQuery")
    @argumentDefinitions(
      scriptId: { type: "ID!" }
      filter: { type: "ScriptExecutionFilterInput" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    scriptExecutions(scriptId: $scriptId, filter: $filter, first: $first, after: $after)
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
