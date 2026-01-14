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
`

export const GET_DIALOG_QUERY = `
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
    rating {
      id
      dialogId
      createdAt
    }
    }
  }
`

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
`

export const GET_DIALOG_MESSAGES_QUERY = `
  query GetAllMessages($dialogId: ID!, $cursor: String, $limit: Int) {
    messages(
      dialogId: $dialogId
      pagination: { cursor: $cursor, limit: $limit }
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
          }
          messageData {
            type
            ... on TextData {
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
`