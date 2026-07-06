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
      statusDefinition {
        id
        name
        color
        kind
      }
      availableTransitions {
        id
        name
        color
      }
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
      organizationImage {
        imageUrl
        hash
      }
      assignedTo
      assignedName
      assigneeImage {
        imageUrl
        hash
      }
      labels {
        id
        key
        color
      }
      dialog {
        id
        currentMode
        tokenUsage {
          chatType
          inputTokensSize
          outputTokensSize
          totalTokensSize
          contextSize
        }
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
        authorImage {
          imageUrl
          hash
        }
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      resolvedAt
      order
    }
  }
`;

export const GET_TICKETS_QUERY = `
  query GetTickets($filter: TicketFilterInput, $pagination: CursorPaginationInput, $search: String) {
    tickets(filter: $filter, pagination: $pagination, search: $search, sort: { field: "order", direction: ASC }) {
      edges {
        cursor
        node {
          id
          ticketNumber
          title
          status
          statusDefinition {
            id
            name
            color
            kind
          }
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
          organizationImage {
            imageUrl
            hash
          }
          assignedTo
          assignedName
          assigneeImage {
            imageUrl
            hash
          }
          labels {
            id
            key
            color
          }
          createdAt
          updatedAt
          resolvedAt
          order
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

// ===== Lifecycle board (custom statuses) =====

const BOARD_CARD_TICKET_LIFECYCLE_FRAGMENT = `
  fragment BoardCardTicket on Ticket {
    id
    ticketNumber
    title
    status
    statusDefinition {
      id
      name
      color
    }
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
    assigneeImage {
      imageUrl
      hash
    }
    labels {
      id
      key
      color
    }
    pendingApproval {
      id
      approvalType
      command
      explanation
      createdAt
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
    createdAt
    updatedAt
    resolvedAt
    order
  }
`;

export const GET_BOARD_COLUMN_TICKETS_QUERY = `
  query GetBoardColumnTickets($statusId: ID!, $limit: Int!, $cursor: String, $search: String, $organizationIds: [ID!], $assigneeIds: [ID!], $labelIds: [ID!]) {
    tickets(
      filter: { statusIds: [$statusId], organizationIds: $organizationIds, assigneeIds: $assigneeIds, labelIds: $labelIds }
      pagination: { limit: $limit, cursor: $cursor }
      search: $search
      sort: { field: "order", direction: ASC }
    ) {
      edges {
        cursor
        node {
          ...BoardCardTicket
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
  ${BOARD_CARD_TICKET_LIFECYCLE_FRAGMENT}
`;

export const GET_TICKET_STATUS_TRANSITION_RULES_QUERY = `
  query TicketStatusTransitionRules {
    ticketStatusTransitionRules {
      from {
        id
      }
      to {
        id
      }
    }
  }
`;

export const TRANSITION_TICKET_MUTATION = `
  mutation TransitionTicket($input: TransitionTicketInput!) {
    transitionTicket(input: $input) {
      ticket {
        id
        status
        statusDefinition {
          id
        }
      }
      userErrors {
        field
        message
      }
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
        authorImage {
          imageUrl
          hash
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
        authorImage {
          imageUrl
          hash
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

export const REORDER_TICKET_MUTATION = `
  mutation ReorderTicket($input: ReorderTicketInput!) {
    reorderTicket(input: $input) {
      ticket { id status order }
      userErrors { field message }
    }
  }
`;

export const ASSIGN_TICKET_MUTATION = `
  mutation AssignTicket($input: AssignTicketInput!) {
    assignTicket(input: $input) {
      ticket { id assignedTo assignedName }
      userErrors { field message }
    }
  }
`;

export const UNASSIGN_TICKET_MUTATION = `
  mutation UnassignTicket($input: TicketIdInput!) {
    unassignTicket(input: $input) {
      ticket { id }
      userErrors { field message }
    }
  }
`;

export const UNLINK_DEVICE_FROM_TICKET_MUTATION = `
  mutation UnlinkDeviceFromTicket($input: TicketIdInput!) {
    unlinkDeviceFromTicket(input: $input) {
      ticket { id deviceId deviceHostname }
      userErrors { field message }
    }
  }
`;

export const UNLINK_ORGANIZATION_FROM_TICKET_MUTATION = `
  mutation UnlinkOrganizationFromTicket($input: TicketIdInput!) {
    unlinkOrganizationFromTicket(input: $input) {
      ticket { id organizationId organizationName }
      userErrors { field message }
    }
  }
`;

export const GET_TICKET_STATUS_TRANSITIONS_QUERY = `
  query TicketStatusTransitions {
    ticketStatusTransitions {
      from
      to
    }
  }
`;

export const GET_TICKET_STATISTICS_QUERY = `
  query GetTicketStatistics {
    ticketStatistics {
      totalCount
      statusCounts {
        status
        count
      }
      statusDefinitionCounts {
        status {
          kind
          color
        }
        count
      }
      averageResolutionTimeFormatted
      averageRating
    }
  }
`;

export const ARCHIVE_RESOLVED_TICKETS_MUTATION = `
  mutation ArchiveResolvedTickets($filter: TicketFilterInput) {
    archiveResolvedTickets(filter: $filter) {
      count
      userErrors {
        field
        message
      }
    }
  }
`;
