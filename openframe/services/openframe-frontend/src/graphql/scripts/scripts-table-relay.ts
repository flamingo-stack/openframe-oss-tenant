import { graphql } from 'react-relay';

/**
 * Scripts list query (v2 — native OpenFrame GraphQL API via Relay).
 *
 * Mirrors the cursor-paginated `scripts(...)` connection from the backend
 * schema. Search and the shell/platform filters are pushed to the server;
 * the pagination fragment drives infinite scroll.
 */
export const scriptsTableRelayQuery = graphql`
  query scriptsTableRelayQuery(
    $filter: ScriptFilterInput
    $search: String
    $first: Int!
    $after: String
  ) {
    ...scriptsTableRelay_query
      @arguments(filter: $filter, search: $search, first: $first, after: $after)
  }
`;

export const scriptsTableRelayFragment = graphql`
  fragment scriptsTableRelay_query on Query
    @refetchable(queryName: "scriptsTableRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "ScriptFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    scripts(filter: $filter, search: $search, first: $first, after: $after)
      @connection(key: "scriptsTableRelay_scripts") {
      filteredCount
      edges {
        node {
          id
          name
          description
          shell
          supportedPlatforms
          defaultTimeoutSeconds
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
