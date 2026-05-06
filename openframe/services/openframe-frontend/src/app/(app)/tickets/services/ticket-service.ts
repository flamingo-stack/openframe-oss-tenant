import type { ChunkData } from '@flamingo-stack/openframe-frontend-core';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import type { ChatType } from '../constants';
import { API_ENDPOINTS } from '../constants';
import { getDialogMessagesQuery } from '../queries/dialogs-queries';
import {
  ARCHIVE_TICKET_MUTATION,
  GET_TICKETS_QUERY,
  getTicketQuery,
  PUT_TICKET_ON_HOLD_MUTATION,
  REOPEN_TICKET_MUTATION,
  RESOLVE_TICKET_MUTATION,
} from '../queries/ticket-queries';
import type { Dialog, DialogStatus, Message } from '../types/dialog.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import type {
  FetchMessagesParams,
  FetchTicketsParams,
  MessagePage,
  TicketService as TicketServiceInterface,
  TicketsPage,
} from './ticket-service.types';

interface TicketNode {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  owner: {
    type: 'CLIENT' | 'ADMIN';
    machineId?: string;
    machine?: { id: string; machineId: string; hostname: string; organizationId?: string };
    userId?: string;
    user?: { id: string; firstName: string; lastName: string };
  };
  deviceId?: string;
  deviceHostname?: string;
  organizationId?: string;
  organizationName?: string;
  organizationImage?: { imageUrl: string };
  assignedTo?: string;
  assignedName?: string;
  assigneeImage?: { imageUrl: string };
  labels?: Array<{ id: string; key: string; color?: string }>;
  notes?: Array<{
    id: string;
    ticketId: string;
    content: string;
    authorId: string;
    author?: { id: string; firstName: string; lastName: string };
    authorImage?: { imageUrl: string };
    createdAt: string;
    updatedAt: string;
  }>;
  attachments?: Array<{
    id: string;
    ticketId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    uploadedAt: string;
    uploadedBy: string;
  }>;
  dialog?: {
    id: string;
    currentMode?: string;
    tokenUsage?: Array<{
      chatType: string;
      inputTokensSize: number | null;
      outputTokensSize: number | null;
      totalTokensSize: number | null;
      contextSize: number | null;
    }> | null;
  };
  description?: string;
  creationSource?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

interface TicketResponse {
  ticket: TicketNode | null;
}

interface TicketsResponse {
  tickets: {
    edges: Array<{ cursor: string; node: TicketNode }>;
    pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor?: string; endCursor?: string };
    filteredCount: number;
  };
}

const TICKET_TO_DIALOG_STATUS: Record<string, DialogStatus> = {
  ACTIVE: 'ACTIVE',
  TECH_REQUIRED: 'TECH_REQUIRED',
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
};

const DIALOG_TO_TICKET_STATUS: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  TECH_REQUIRED: 'TECH_REQUIRED',
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
};

interface StatusMutationPayload {
  ticket: { id: string; status: string } | null;
  userErrors: Array<{ field?: string[]; message: string }>;
}

const STATUS_TO_MUTATION: Record<string, { mutation: string; key: string }> = {
  ON_HOLD: { mutation: PUT_TICKET_ON_HOLD_MUTATION, key: 'putTicketOnHold' },
  RESOLVED: { mutation: RESOLVE_TICKET_MUTATION, key: 'resolveTicket' },
  ARCHIVED: { mutation: ARCHIVE_TICKET_MUTATION, key: 'archiveTicket' },
  ACTIVE: { mutation: REOPEN_TICKET_MUTATION, key: 'reopenTicket' },
};

function normalizeTicketToDialog(ticket: TicketNode): Dialog {
  return {
    id: ticket.id,
    title: ticket.title,
    status: TICKET_TO_DIALOG_STATUS[ticket.status] || (ticket.status as DialogStatus),
    owner:
      ticket.owner.type === 'CLIENT'
        ? {
            type: 'CLIENT' as const,
            machineId: ticket.owner.machineId || '',
            machine: ticket.owner.machine,
          }
        : { type: ticket.owner.type as any },
    createdAt: ticket.createdAt,
    statusUpdatedAt: ticket.updatedAt || null,
    resolvedAt: ticket.resolvedAt || null,
    aiResolutionSuggestedAt: null,
    rating: null,

    currentMode: ticket.dialog?.currentMode,
    ticketNumber: ticket.ticketNumber,
    dialogId: ticket.dialog?.id,
    description: ticket.description,
    creationSource: ticket.creationSource,
    deviceId: ticket.deviceId,
    deviceHostname: ticket.deviceHostname,
    organizationId: ticket.organizationId,
    organizationName: ticket.organizationName,
    organizationImageUrl: ticket.organizationImage?.imageUrl,
    assignedTo: ticket.assignedTo,
    assignedName: ticket.assignedName,
    assigneeImageUrl: ticket.assigneeImage?.imageUrl,
    labels: ticket.labels,
    attachments: ticket.attachments,
    tokenUsage: ticket.dialog?.tokenUsage ?? undefined,
    notes: ticket.notes?.map(note => ({
      id: note.id,
      ticketId: note.ticketId,
      content: note.content,
      authorId: note.authorId,
      authorName: note.author ? `${note.author.firstName} ${note.author.lastName}`.trim() : undefined,
      authorImageUrl: note.authorImage?.imageUrl,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  };
}

export class TicketService implements TicketServiceInterface {
  private async mutateTicketStatus(ticketId: string, mutation: string, responseKey: string): Promise<DialogStatus> {
    const response = await apiClient.post<GraphQlResponse<Record<string, StatusMutationPayload>>>(
      API_ENDPOINTS.GRAPHQL,
      { query: mutation, variables: { input: { id: ticketId } } },
    );

    const data = extractGraphQlData(response);
    const payload = data[responseKey];

    if (payload.userErrors?.length) {
      throw new Error(payload.userErrors[0].message);
    }

    if (!payload.ticket) {
      throw new Error('Ticket status mutation returned no ticket');
    }

    return TICKET_TO_DIALOG_STATUS[payload.ticket.status] || (payload.ticket.status as DialogStatus);
  }

  async fetchDialogs(params: FetchTicketsParams): Promise<TicketsPage> {
    const paginationVars: Record<string, unknown> = { limit: params.limit };
    if (params.cursor) {
      paginationVars.cursor = params.cursor;
    }

    const ticketStatuses = params.statuses.map(s => DIALOG_TO_TICKET_STATUS[s] || s);

    const response = await apiClient.post<GraphQlResponse<TicketsResponse>>(API_ENDPOINTS.GRAPHQL, {
      query: GET_TICKETS_QUERY,
      variables: {
        filter: { statuses: ticketStatuses },
        pagination: paginationVars,
        search: params.search || undefined,
      },
    });

    const data = extractGraphQlData(response);
    const connection = data.tickets;

    return {
      dialogs: (connection?.edges || []).map(edge => normalizeTicketToDialog(edge.node)),
      pageInfo: connection?.pageInfo || {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    };
  }

  async fetchDialog(id: string): Promise<Dialog | null> {
    const includeTokenUsage = featureFlags.tokenBasedMemory.enabled();
    const response = await apiClient.post<GraphQlResponse<TicketResponse>>(API_ENDPOINTS.GRAPHQL, {
      query: getTicketQuery({ includeTokenUsage }),
      variables: { id },
    });

    const data = extractGraphQlData(response);
    if (!data.ticket) return null;

    return normalizeTicketToDialog(data.ticket);
  }

  async fetchMessages(params: FetchMessagesParams): Promise<MessagePage> {
    const includeContextCompaction = featureFlags.tokenBasedMemory.enabled();
    const includeThinking = featureFlags.thinking.enabled();
    const response = await apiClient.post<
      GraphQlResponse<{
        messages: { edges: Array<{ cursor: string; node: Message }>; pageInfo: MessagePage['pageInfo'] };
      }>
    >('/chat/graphql', {
      query: getDialogMessagesQuery({ includeContextCompaction, includeThinking }),
      variables: {
        dialogId: params.dialogId,
        chatType: params.chatType,
        cursor: params.cursor,
        limit: params.limit,
        sortField: params.sortField || 'createdAt',
        sortDirection: params.sortDirection || 'DESC',
      },
    });

    const data = extractGraphQlData(response);
    const { edges, pageInfo } = data.messages;

    return {
      messages: edges.map(edge => edge.node),
      pageInfo,
    };
  }

  async updateStatus(ticketId: string, status: DialogStatus): Promise<boolean> {
    await this.mutateStatus(ticketId, status);
    return true;
  }

  async mutateStatus(ticketId: string, status: DialogStatus): Promise<DialogStatus> {
    const mapped = STATUS_TO_MUTATION[status];
    if (!mapped) {
      throw new Error(`Unsupported status transition: ${status}`);
    }
    return this.mutateTicketStatus(ticketId, mapped.mutation, mapped.key);
  }

  async sendMessage(dialogId: string, content: string, chatType: ChatType): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.SEND_MESSAGE, {
      dialogId,
      content,
      chatType,
    });

    if (!response.ok) {
      throw new Error(response.error || 'Failed to send message');
    }
  }

  async approveRequest(requestId: string): Promise<void> {
    const response = await apiClient.post(`${API_ENDPOINTS.APPROVAL_REQUEST}/${requestId}/approve`, {
      approve: true,
    });

    if (!response.ok) {
      throw new Error(response.error || `Failed to approve request (${response.status})`);
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    const response = await apiClient.post(`${API_ENDPOINTS.APPROVAL_REQUEST}/${requestId}/approve`, {
      approve: false,
    });

    if (!response.ok) {
      throw new Error(response.error || `Failed to reject request (${response.status})`);
    }
  }

  async archiveDialog(ticketId: string): Promise<boolean> {
    await this.mutateTicketStatus(ticketId, ARCHIVE_TICKET_MUTATION, 'archiveTicket');
    return true;
  }

  async fetchChunks(dialogId: string, chatType: ChatType, fromSequenceId?: number | null): Promise<ChunkData[]> {
    let url = `${API_ENDPOINTS.DIALOG_CHUNKS}/${dialogId}/chunks?chatType=${chatType}`;
    if (fromSequenceId !== null && fromSequenceId !== undefined) {
      url += `&fromSequenceId=${fromSequenceId}`;
    }

    const response = await apiClient.get<ChunkData[]>(url);

    if (!response.ok) {
      console.error(`Failed to fetch ${chatType} chunks:`, response.status);
      return [];
    }

    return response.data || [];
  }
}
