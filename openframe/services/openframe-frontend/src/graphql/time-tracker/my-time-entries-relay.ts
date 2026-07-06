import { graphql } from 'react-relay';

export const myTimeEntriesRelayQuery = graphql`
  query myTimeEntriesRelayQuery($first: Int!, $after: String) {
    ...myTimeEntriesRelay_query @arguments(first: $first, after: $after)
  }
`;

export const myTimeEntriesRelayFragment = graphql`
  fragment myTimeEntriesRelay_query on Query
    @refetchable(queryName: "myTimeEntriesRelayPaginationQuery")
    @argumentDefinitions(first: { type: "Int", defaultValue: 3 }, after: { type: "String" }) {
    myTimeEntries(sort: { field: "startedAt", direction: DESC }, first: $first, after: $after)
      @connection(key: "MyTimeEntries_myTimeEntries") {
      edges {
        cursor
        node {
          ...timeEntryFields_timeEntry @relay(mask: false)
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;
