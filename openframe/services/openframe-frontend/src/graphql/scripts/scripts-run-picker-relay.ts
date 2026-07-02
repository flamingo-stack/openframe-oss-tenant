import { graphql } from 'react-relay';

/**
 * Script picker for the "Run Script on device" modal (v2). Lists ACTIVE scripts
 * only, with server-side name search and an optional tag filter, paginated as a
 * `@connection` so the modal list scrolls infinitely. `search` / `tagIds` are
 * baked into the connection args, so changing a filter starts a fresh connection
 * and `loadNext` keeps paging within the active filter.
 */
export const scriptsRunPickerRelayQuery = graphql`
  query scriptsRunPickerRelayQuery($search: String, $tagIds: [ID!], $first: Int!) {
    ...scriptsRunPickerRelay_query @arguments(search: $search, tagIds: $tagIds, first: $first)
  }
`;

export const scriptsRunPickerRelayFragment = graphql`
  fragment scriptsRunPickerRelay_query on Query
  @refetchable(queryName: "scriptsRunPickerRelayPaginationQuery")
  @argumentDefinitions(
    search: { type: "String" }
    tagIds: { type: "[ID!]" }
    first: { type: "Int", defaultValue: 20 }
    after: { type: "String" }
  ) {
    scripts(filter: { statuses: [ACTIVE], tagIds: $tagIds }, search: $search, first: $first, after: $after)
      @connection(key: "scriptsRunPickerRelay_scripts") {
      edges {
        node {
          id
          name
          description
          supportedPlatforms
        }
      }
    }
  }
`;
