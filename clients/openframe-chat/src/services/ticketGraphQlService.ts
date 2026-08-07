import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

// --- Types ---

export interface TicketLabel {
  key: string;
}

export interface TicketStatusDefinition {
  id: string;
  name: string;
  color: string;
  kind: string;
}

export interface TicketNode {
  id: string;
  ticketNumber: number;
  title: string;
  description?: string;
  status: string;
  // Lifecycle (custom-status) definition.
  statusDefinition?: TicketStatusDefinition | null;
  creationSource?: string;
  labels: TicketLabel[];
  dialog: { id: string; currentMode?: string; status?: string } | null;
  createdAt: string;
}

export interface TicketEdge {
  cursor: string;
  node: TicketNode;
}

export interface TicketsPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface TicketsConnection {
  edges: TicketEdge[];
  pageInfo: TicketsPageInfo;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  tempAttachmentIds?: string[];
}

export interface UserError {
  field: string[] | null;
  message: string;
}

export interface TempAttachment {
  id: string;
  uploadUrl: string;
}

// --- Queries ---

const GET_TICKETS_QUERY = gql`
  query GetTickets($filter: TicketFilterInput, $pagination: CursorPaginationInput, $search: String) {
    tickets(filter: $filter, pagination: $pagination, search: $search) {
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
          creationSource
          labels {
            key
          }
          dialog {
            id
          }
          createdAt
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

const CREATE_TICKET_MUTATION = gql`
  mutation CreateTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      ticket {
        id
        ticketNumber
        title
        status
        labels {
          id
          key
          color
        }
        dialog {
          id
        }
        createdAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_TEMP_ATTACHMENT_UPLOAD_URL = gql`
  mutation CreateTempAttachmentUploadUrl($input: CreateTempAttachmentInput!) {
    createTempAttachmentUploadUrl(input: $input) {
      tempAttachment {
        id
        uploadUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DELETE_TEMP_ATTACHMENT = gql`
  mutation DeleteTempAttachment($input: DeleteByIdInput!) {
    deleteTempAttachment(input: $input) {
      success
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_TICKET_QUERY = gql`
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
      creationSource
      labels {
        key
      }
      dialog {
        id
        currentMode
        status
      }
      createdAt
    }
  }
`;

// Escalation is ticket-keyed on the backend (the dialog is resolved from the
// ticket), and all three resolvers require an AGENT principal — which is what
// this client's machine token is.
const REQUEST_TICKET_ESCALATION = gql`
  mutation RequestTicketEscalation($input: TicketIdInput!) {
    requestTicketEscalation(input: $input) {
      ticketId
      userErrors {
        field
        message
      }
    }
  }
`;

const APPROVE_TICKET_ESCALATION = gql`
  mutation ApproveTicketEscalation($input: TicketIdInput!) {
    approveTicketEscalation(input: $input) {
      ticketId
      userErrors {
        field
        message
      }
    }
  }
`;

const DECLINE_TICKET_ESCALATION = gql`
  mutation DeclineTicketEscalation($input: TicketIdInput!) {
    declineTicketEscalation(input: $input) {
      ticketId
      userErrors {
        field
        message
      }
    }
  }
`;

interface TicketEscalationPayload {
  ticketId: string | null;
  userErrors: UserError[];
}

// --- Service ---

class TicketGraphQlService {
  private graphQlClient: GraphQLClient | null = null;
  private currentEndpoint: string | null = null;

  private async initializeClient(): Promise<GraphQLClient> {
    if (this.graphQlClient && this.currentEndpoint) {
      const token = tokenService.getCurrentToken();
      if (token) {
        this.graphQlClient.setHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        });
      }
      return this.graphQlClient;
    }

    const baseUrl = tokenService.getCurrentApiBaseUrl();
    const token = tokenService.getCurrentToken();

    if (!baseUrl || !token) {
      throw new Error('API base URL or token not available');
    }

    const endpoint = `${baseUrl}/chat/graphql`;

    this.graphQlClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      fetch: fetch,
    });

    this.currentEndpoint = endpoint;
    return this.graphQlClient;
  }

  private async request<T>(document: RequestDocument, variables?: Variables): Promise<T> {
    const client = await this.initializeClient();
    return client.request<T>(document, variables);
  }

  async getTickets(params: {
    statuses?: string[];
    cursor?: string | null;
    limit?: number;
    search?: string;
  }): Promise<TicketsConnection | null> {
    // Errors propagate to the caller (React Query) so a failed fetch becomes a
    // rejected query that retries — rather than a swallowed `null` that the
    // queryFn would cache as a successful empty list.
    await tokenService.ensureTokenReady();

    const variables: Record<string, unknown> = {};

    if (params.statuses?.length) {
      variables.filter = { statuses: params.statuses };
    }

    const pagination: Record<string, unknown> = { limit: params.limit ?? 20 };
    if (params.cursor) {
      pagination.cursor = params.cursor;
    }
    variables.pagination = pagination;

    if (params.search) {
      variables.search = params.search;
    }

    const data = await this.request<{ tickets: TicketsConnection }>(GET_TICKETS_QUERY, variables);
    return data.tickets || null;
  }

  async getTicket(id: string): Promise<TicketNode | null> {
    try {
      await tokenService.ensureTokenReady();
      const data = await this.request<{ ticket: TicketNode }>(GET_TICKET_QUERY, { id });
      return data.ticket || null;
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      return null;
    }
  }

  /**
   * Ask for a handoff to a human technician. This does NOT escalate: the
   * backend posts an escalation offer into the chat (deferring it to the end
   * of the turn when Fae is mid-stream) and the handoff runs only once the
   * client approves. Idempotent while an offer is already pending.
   */
  async requestTicketEscalation(ticketId: string): Promise<void> {
    await this.runEscalationMutation(REQUEST_TICKET_ESCALATION, ticketId, 'requestTicketEscalation');
  }

  /** Resolve the pending offer: approve performs the handoff, decline records the choice. */
  async approveTicketEscalation(ticketId: string): Promise<void> {
    await this.runEscalationMutation(APPROVE_TICKET_ESCALATION, ticketId, 'approveTicketEscalation');
  }

  async declineTicketEscalation(ticketId: string): Promise<void> {
    await this.runEscalationMutation(DECLINE_TICKET_ESCALATION, ticketId, 'declineTicketEscalation');
  }

  private async runEscalationMutation(
    document: RequestDocument,
    ticketId: string,
    field: 'requestTicketEscalation' | 'approveTicketEscalation' | 'declineTicketEscalation',
  ): Promise<void> {
    await tokenService.ensureTokenReady();

    const data = await this.request<Record<string, TicketEscalationPayload>>(document, {
      input: { id: ticketId },
    });

    const payload = data[field];
    if (payload?.userErrors?.length) {
      throw new Error(payload.userErrors[0].message);
    }
  }

  async createTicket(input: CreateTicketInput): Promise<TicketNode> {
    await tokenService.ensureTokenReady();

    const data = await this.request<{
      createTicket: { ticket: TicketNode | null; userErrors: UserError[] };
    }>(CREATE_TICKET_MUTATION, { input });

    const payload = data.createTicket;
    if (payload.userErrors?.length) {
      throw new Error(payload.userErrors[0].message);
    }
    if (!payload.ticket) {
      throw new Error('Failed to create ticket: no ticket returned');
    }

    return payload.ticket;
  }

  async createTempAttachmentUploadUrl(fileName: string, contentType?: string): Promise<TempAttachment> {
    await tokenService.ensureTokenReady();

    const input: Record<string, string> = { fileName };
    if (contentType) {
      input.contentType = contentType;
    }

    const data = await this.request<{
      createTempAttachmentUploadUrl: {
        tempAttachment: TempAttachment | null;
        userErrors: UserError[];
      };
    }>(CREATE_TEMP_ATTACHMENT_UPLOAD_URL, { input });

    const payload = data.createTempAttachmentUploadUrl;
    if (payload.userErrors?.length) {
      throw new Error(payload.userErrors[0].message);
    }
    if (!payload.tempAttachment) {
      throw new Error('Failed to create temp attachment upload URL');
    }

    return payload.tempAttachment;
  }

  async deleteTempAttachment(id: string): Promise<boolean> {
    try {
      await tokenService.ensureTokenReady();

      const data = await this.request<{
        deleteTempAttachment: { success: boolean; userErrors: UserError[] };
      }>(DELETE_TEMP_ATTACHMENT, { input: { id } });

      return data.deleteTempAttachment.success;
    } catch (error) {
      console.error('Failed to delete temp attachment:', error);
      return false;
    }
  }

  dispose(): void {
    this.graphQlClient = null;
    this.currentEndpoint = null;
  }
}

export const ticketGraphQlService = new TicketGraphQlService();
