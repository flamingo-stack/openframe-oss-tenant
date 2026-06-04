// Ticket status GraphQL queries and mutations (openframe-saas-ai-agent service via /chat/graphql)

const STATUS_DEFINITION_FIELDS = `
  id
  name
  color
  position
  kind
  isSystem
  systemKey
`;

export const GET_TICKET_STATUSES_QUERY = `
  query TicketStatuses {
    ticketStatuses {
      ${STATUS_DEFINITION_FIELDS}
    }
  }
`;

export const CREATE_TICKET_STATUS_MUTATION = `
  mutation CreateTicketStatus($input: CreateTicketStatusInput!) {
    createTicketStatus(input: $input) {
      ${STATUS_DEFINITION_FIELDS}
    }
  }
`;

export const UPDATE_TICKET_STATUS_MUTATION = `
  mutation UpdateTicketStatus($input: UpdateTicketStatusInput!) {
    updateTicketStatus(input: $input) {
      ${STATUS_DEFINITION_FIELDS}
    }
  }
`;

export const DELETE_TICKET_STATUS_MUTATION = `
  mutation DeleteTicketStatus($input: DeleteTicketStatusInput!) {
    deleteTicketStatus(input: $input)
  }
`;

export const REORDER_TICKET_STATUS_MUTATION = `
  mutation ReorderTicketStatus($input: ReorderTicketStatusInput!) {
    reorderTicketStatus(input: $input) {
      ${STATUS_DEFINITION_FIELDS}
    }
  }
`;
