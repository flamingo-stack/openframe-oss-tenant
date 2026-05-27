import { graphql } from 'react-relay';

export const notificationsListQuery = graphql`
  query notificationsListQuery($first: Int!, $after: String, $filter: NotificationFilterInput, $search: String) {
    notifications(first: $first, after: $after, filter: $filter, search: $search)
      @connection(key: "NotificationsList_notifications", filters: ["filter", "search"]) {
      edges {
        cursor
        node {
          id
          severity
          title
          description
          createdAt
          read
          context {
            __typename
            type
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;
