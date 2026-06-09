import { graphql } from 'react-relay';

export const notificationsSectionRelayQuery = graphql`
  query notificationsSectionRelayQuery(
    $first: Int!
    $after: String
    $filter: NotificationFilterInput
    $search: String
  ) {
    ...notificationsSectionRelay_query
      @arguments(first: $first, after: $after, filter: $filter, search: $search)
  }
`;

export const notificationsSectionRelayFragment = graphql`
  fragment notificationsSectionRelay_query on Query
    @refetchable(queryName: "notificationsSectionRelayPaginationQuery")
    @argumentDefinitions(
      first: { type: "Int", defaultValue: 50 }
      after: { type: "String" }
      filter: { type: "NotificationFilterInput" }
      search: { type: "String" }
    ) {
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
            ... on AdminAiMessageContext {
              dialogId
            }
            ... on CustomerTicketCreatedContext {
              customerTicketId: ticketId
            }
            ... on AdminApprovalRequestContext {
              approvalRequestId
              dialogId
              ticketId
              approvalType
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
