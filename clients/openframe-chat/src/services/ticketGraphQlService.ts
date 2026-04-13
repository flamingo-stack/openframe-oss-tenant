import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

// --- Types ---

export interface TicketLabel {
  name: string;
}

export interface TicketNode {
  id: string;
  ticketNumber: number;
  title: string;
  description?: string;
  status: string;
  creationSource?: string;
  labels: TicketLabel[];
  dialog: { id: string } | null;
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
          creationSource
          labels {
            name
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
          name
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
      creationSource
      labels {
        name
      }
      dialog {
        id
      }
      createdAt
    }
  }
`;

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
    try {
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
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      return null;
    }
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
