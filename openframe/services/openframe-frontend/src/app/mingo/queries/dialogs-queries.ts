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
            ... on ClientOwner {
              machineId
            }
            ... on AssistantOwner {
              model
            }
            ... on AdminOwner {
              userId
              user {
                id
              }
            }
          }
          messageData {
            type
            ... on TextData {
              text
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