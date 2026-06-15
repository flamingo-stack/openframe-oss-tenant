import { graphql } from 'react-relay';

export const notificationsDrawerRelayQuery = graphql`
  query notificationsDrawerRelayQuery($first: Int!, $after: String) {
    ...notificationsDrawerRelay_query @arguments(first: $first, after: $after)
  }
`;

export const notificationsDrawerRelayFragment = graphql`
  fragment notificationsDrawerRelay_query on Query
    @refetchable(queryName: "notificationsDrawerRelayPaginationQuery")
    @argumentDefinitions(
      first: { type: "Int", defaultValue: 30 }
      after: { type: "String" }
    ) {
    notifications(first: $first, after: $after, filter: { read: false }, search: null)
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
          category
          context {
            __typename
            type
            ... on AdminAiMessageContext {
              dialogId
            }
            ... on AdminApprovalRequestContext {
              approvalRequestId
              dialogId
              ticketId
              approvalType
              resolution
              toolCalls {
                toolExecutionRequestId
                toolName
                toolTitle
                toolExplanation
                toolType
                requiresApproval
                approvalType
                toolCallArguments
              }
            }
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
