// Ticket GraphQL queries and mutations (openframe-saas-ai-agent service via /chat/graphql)

export const CREATE_TICKET_MUTATION = `
  mutation CreateTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      ticket {
        id
        ticketNumber
        title
        description
        status
        owner {
          ... on ClientTicketOwner {
            type
            machineId
          }
          ... on AdminTicketOwner {
            type
            userId
          }
        }
        deviceId
        deviceHostname
        organizationId
        organizationName
        assignedTo
        assignedName
        labels {
          id
          key
          color
        }
        attachments {
          id
          ticketId
          fileName
          contentType
          fileSize
          uploadedAt
          uploadedBy
        }
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_TEMP_ATTACHMENT_UPLOAD_URL = `
  mutation CreateTempAttachmentUploadUrl($input: CreateTempAttachmentInput!) {
    createTempAttachmentUploadUrl(input: $input) {
      tempAttachment {
        id
        fileName
        contentType
        fileSize
        uploadUrl
        createdAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const DELETE_TEMP_ATTACHMENT = `
  mutation DeleteTempAttachment($input: DeleteByIdInput!) {
    deleteTempAttachment(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

export const DELETE_TICKET_ATTACHMENT = `
  mutation DeleteTicketAttachment($input: DeleteByIdInput!) {
    deleteTicketAttachment(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_TICKET_QUERY = `
  query GetTicket($id: ID!) {
    ticket(id: $id) {
      id
      ticketNumber
      title
      description
      status
      creationSource
      owner {
        ... on ClientTicketOwner {
          type
          machineId
          machine {
            id
            machineId
            hostname
            organizationId
          }
        }
        ... on AdminTicketOwner {
          type
          userId
          user {
            id
            firstName
            lastName
          }
        }
      }
      deviceId
      deviceHostname
      organizationId
      organizationName
      assignedTo
      assignedName
      labels {
        id
        key
        color
      }
      dialog {
        id
        currentMode
      }
      attachments {
        id
        ticketId
        fileName
        contentType
        fileSize
        uploadedAt
        uploadedBy
      }
      notes {
        id
        ticketId
        content
        authorId
        author {
          id
          firstName
          lastName
        }
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      resolvedAt
    }
  }
`;

export const GET_TICKETS_QUERY = `
  query GetTickets($filter: TicketFilterInput, $pagination: CursorPaginationInput, $search: String) {
    tickets(filter: $filter, pagination: $pagination, search: $search) {
      edges {
        cursor
        node {
          id
          ticketNumber
          title
          status
          owner {
            ... on ClientTicketOwner {
              type
              machineId
              machine {
                id
                machineId
                hostname
                organizationId
              }
            }
            ... on AdminTicketOwner {
              type
              userId
              user {
                id
                firstName
                lastName
              }
            }
          }
          deviceId
          deviceHostname
          organizationId
          organizationName
          assignedTo
          assignedName
          labels {
            id
            key
            color
          }
          createdAt
          updatedAt
          resolvedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      filteredCount
    }
  }
`;

export const GET_TICKET_LABELS_QUERY = `
  query TicketLabels {
    ticketLabels {
      id
      key
      description
      color
      createdAt
      createdBy
    }
  }
`;

export const GET_TICKET_ATTACHMENT_DOWNLOAD_URL = `
  query TicketAttachmentDownloadUrl($attachmentId: ID!) {
    ticketAttachmentDownloadUrl(attachmentId: $attachmentId)
  }
`;

export const ADD_TICKET_NOTE_MUTATION = `
  mutation AddTicketNote($input: AddTicketNoteInput!) {
    addTicketNote(input: $input) {
      note {
        id
        ticketId
        content
        authorId
        author {
          id
          firstName
          lastName
        }
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_TICKET_NOTE_MUTATION = `
  mutation UpdateTicketNote($input: UpdateTicketNoteInput!) {
    updateTicketNote(input: $input) {
      note {
        id
        ticketId
        content
        authorId
        author {
          id
          firstName
          lastName
        }
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const DELETE_TICKET_NOTE_MUTATION = `
  mutation DeleteTicketNote($input: DeleteByIdInput!) {
    deleteTicketNote(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_TICKET_MUTATION = `
  mutation UpdateTicket($input: UpdateTicketInput!) {
    updateTicket(input: $input) {
      ticket {
        id
        ticketNumber
        title
        description
        status
        owner {
          ... on ClientTicketOwner {
            type
            machineId
          }
          ... on AdminTicketOwner {
            type
            userId
          }
        }
        deviceId
        deviceHostname
        organizationId
        organizationName
        assignedTo
        assignedName
        labels {
          id
          key
          color
        }
        attachments {
          id
          ticketId
          fileName
          contentType
          fileSize
          uploadedAt
          uploadedBy
        }
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const PUT_TICKET_ON_HOLD_MUTATION = `
  mutation PutTicketOnHold($input: TicketIdInput!) {
    putTicketOnHold(input: $input) {
      ticket { id status }
      userErrors { field message }
    }
  }
`;

export const RESOLVE_TICKET_MUTATION = `
  mutation ResolveTicket($input: TicketIdInput!) {
    resolveTicket(input: $input) {
      ticket { id status resolvedAt }
      userErrors { field message }
    }
  }
`;

export const ARCHIVE_TICKET_MUTATION = `
  mutation ArchiveTicket($input: TicketIdInput!) {
    archiveTicket(input: $input) {
      ticket { id status }
      userErrors { field message }
    }
  }
`;

export const REOPEN_TICKET_MUTATION = `
  mutation ReopenTicket($input: TicketIdInput!) {
    reopenTicket(input: $input) {
      ticket { id status }
      userErrors { field message }
    }
  }
`;
