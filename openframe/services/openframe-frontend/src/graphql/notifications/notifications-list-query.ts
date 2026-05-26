import { graphql } from 'react-relay';

export const notificationsListQuery = graphql`
  query notificationsListQuery($first: Int!, $after: String, $filter: NotificationFilterInput) {
    notifications(first: $first, after: $after, filter: $filter) {
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
