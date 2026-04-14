export const GET_DIALOGS_QUERY = `
  query GetDialogs($filter: DialogFilterInput, $pagination: CursorPaginationInput, $search: String) {
  dialogs(filter: $filter, pagination: $pagination, search: $search) {
   edges {
    cursor
    node {
     id
     title
     status
     owner {
      ... on ClientDialogOwner {
       machineId
       machine {
        id
        machineId
        hostname
        organizationId
       }
      }
     }
     createdAt
     statusUpdatedAt
     resolvedAt
     aiResolutionSuggestedAt
     rating {
      id
      dialogId
      createdAt
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

const TOKEN_USAGE_FRAGMENT = `
    tokenUsage {
      inputTokensSize
      outputTokensSize
      totalTokensSize
      contextSize
    }`;

export function getDialogQuery({ includeTokenUsage = false } = {}) {
  return `
  query GetDialog($id: ID!) {
    dialog(id: $id) {
    id
    title
    status
    owner {
      ... on ClientDialogOwner {
      machineId
      machine {
        id
        machineId
        hostname
       }
      }
    }
    createdAt
    statusUpdatedAt
    resolvedAt
    aiResolutionSuggestedAt
    ${includeTokenUsage ? TOKEN_USAGE_FRAGMENT : ''}
    rating {
      id
      dialogId
      createdAt
    }
    }
  }
`;
}

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

export function getDialogMessagesQuery({ includeContextCompaction = false } = {}) {
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
