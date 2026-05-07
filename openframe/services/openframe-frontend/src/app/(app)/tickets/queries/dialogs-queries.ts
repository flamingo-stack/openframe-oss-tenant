export const GET_DIALOG_STATISTICS_QUERY = `
  query GetDialogStatistics {
    dialogStatistics {
      totalCount
      statusCounts {
        status
        count
      }
      averageResolutionTimeFormatted
      averageRating
    }
  }
`;

const CONTEXT_COMPACTION_FRAGMENT = `
            ... on ContextCompactionStartData {
              type
            }

            ... on ContextCompactionEndData {
              type
              summary
            }`;

const THINKING_FRAGMENT = `
            ... on ThinkingData {
              text
            }`;

export function getDialogMessagesQuery({ includeContextCompaction = false, includeThinking = false } = {}) {
  return `
  query GetAllMessages($dialogId: ID!, $chatType: ChatType, $cursor: String, $limit: Int, $sortField: String, $sortDirection: SortDirection) {
    messages(
      dialogId: $dialogId
      chatType: $chatType
      pagination: { cursor: $cursor, limit: $limit }
      sort: { field: $sortField, direction: $sortDirection }
    ) {
      edges {
        cursor
        node {
          id
          dialogId
          chatType
          dialogMode
          createdAt
          owner {
            type
            ... on AdminOwner {
              user {
                id
                firstName
                lastName
              }
            }
          }
          messageData {
            type
            ... on TextData {
              text
            }

            ${includeThinking ? THINKING_FRAGMENT : ''}

            ... on SystemData {
              text
            }

            ... on ExecutingToolData {
              type
              integratedToolType
              toolFunction
              parameters
              requiresApproval
              approvalStatus
            }

            ... on ExecutedToolData {
              type
              integratedToolType
              toolFunction
              result
              success
              requiredApproval
              approvalStatus
            }

            ... on ApprovalRequestData {
              type
              approvalRequestId
              approvalType
              command
              explanation
            }

            ... on ApprovalResultData {
              type
              approvalRequestId
              approved
              approvalType
            }

            ${includeContextCompaction ? CONTEXT_COMPACTION_FRAGMENT : ''}

            ... on ErrorData {
              error
              details
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;
}
