import { graphql } from 'react-relay';

/**
 * Scripts list query (v2 — native OpenFrame GraphQL API via Relay).
 *
 * Mirrors the cursor-paginated `scripts(...)` connection from the backend
 * schema. Search and the shell/platform/author/tag filters are pushed to the
 * server; the pagination fragment drives infinite scroll.
 *
 * `scriptFilters` (the filter facets) rides the SAME operation, so each filter
 * interaction is a single round-trip and the dropdown options update atomically
 * with the rows. It sits on the outer query — not in the `@refetchable`
 * fragment — so `loadNext` pagination does not refetch it. Facet semantics: the
 * backend excludes each facet's OWN group when narrowing, so a group's options
 * never vanish while the user multi-selects within it. Option `value`s match
 * the `ScriptFilterInput` fields (shells/platforms = enum, authors = user id).
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
    scriptFilters(filter: $filter) {
      shells {
        value
        label
        count
      }
      platforms {
        value
        label
        count
      }
      authors {
        value
        label
        count
      }
    }
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
      __id
      filteredCount
      edges {
        node {
          id
          name
          description
          shell
          supportedPlatforms
          defaultTimeoutSeconds
          author {
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
