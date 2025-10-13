export const GET_DIALOGS_QUERY = `
  query GetDialogs($pagination: CursorPaginationInput, $search: String) {
    dialogs(pagination: $pagination, search: $search) {
      edges {
        cursor
        node {
          id
          title
          status
          owner { 
            machineId
          }
          createdAt
          statusUpdatedAt
          resolvedAt
          aiResolutionSuggestedAt
          rating {
            id
            dialogId
            rating
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
  query GetDialog($id: String!) {
    dialog(id: $id) {
      id
      title
      status
      owner {
        machineId
      }
      createdAt
      statusUpdatedAt
      resolvedAt
      aiResolutionSuggestedAt
      rating {
        id
        dialogId
        rating
        createdAt
      }
    }
  }
`
