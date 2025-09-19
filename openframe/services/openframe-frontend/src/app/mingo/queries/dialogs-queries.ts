export const GET_DIALOGS_QUERY = `
  query GetDialogs($archived: Boolean, $search: String) {
    dialogs(archived: $archived, search: $search) {
      id
      topic
      source
      slaCountdown
      status
      createdAt
      updatedAt
      archived
    }
  }
`
