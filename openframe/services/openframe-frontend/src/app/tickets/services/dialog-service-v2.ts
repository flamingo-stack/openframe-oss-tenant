import type { ChunkData, NatsMessageType } from '@flamingo-stack/openframe-frontend-core';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import type { ChatType } from '../constants';
import { API_ENDPOINTS } from '../constants';
import {
  ARCHIVE_TICKET_MUTATION,
  GET_TICKETS_QUERY,
  getTicketQuery,
  PUT_TICKET_ON_HOLD_MUTATION,
  REOPEN_TICKET_MUTATION,
  RESOLVE_TICKET_MUTATION,
} from '../queries/ticket-queries';
import type { Dialog, DialogStatus } from '../types/dialog.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import type {
  DialogService,
  DialogsPage,
  FetchDialogsParams,
  FetchMessagesParams,
  MessagePage,
  RealtimeAction,
} from './dialog-service.types';
import { DialogServiceV1 } from './dialog-service-v1';

// Raw ticket node from the GraphQL response
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
  assignedTo?: string;
  assignedName?: string;
  labels?: Array<{ id: string; key: string; color?: string }>;
  notes?: Array<{
    id: string;
    ticketId: string;
    content: string;
    authorId: string;
    author?: { id: string; firstName: string; lastName: string };
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
    tokenUsage?: {
      inputTokensSize: number | null;
      outputTokensSize: number | null;
      totalTokensSize: number | null;
      contextSize: number | null;
    } | null;
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

// TicketStatus -> DialogStatus mapping
const TICKET_TO_DIALOG_STATUS: Record<string, DialogStatus> = {
  ACTIVE: 'ACTIVE',
  TECH_REQUIRED: 'ACTION_REQUIRED',
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
};

// DialogStatus -> TicketStatus mapping (for filters)
const DIALOG_TO_TICKET_STATUS: Record<string, string> = {
  ACTIVE: 'ACTIVE',
  ACTION_REQUIRED: 'TECH_REQUIRED',
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

    // V2 ticket-specific fields
    currentMode: ticket.dialog?.currentMode,
    ticketNumber: ticket.ticketNumber,
    dialogId: ticket.dialog?.id,
    description: ticket.description,
    creationSource: ticket.creationSource,
    deviceId: ticket.deviceId,
    deviceHostname: ticket.deviceHostname,
    organizationId: ticket.organizationId,
    organizationName: ticket.organizationName,
    assignedTo: ticket.assignedTo,
    assignedName: ticket.assignedName,
    labels: ticket.labels,
    attachments: ticket.attachments,
    tokenUsage: ticket.dialog?.tokenUsage ?? undefined,
    notes: ticket.notes?.map(note => ({
      id: note.id,
      ticketId: note.ticketId,
      content: note.content,
      authorId: note.authorId,
      authorName: note.author ? `${note.author.firstName} ${note.author.lastName}`.trim() : undefined,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  };
}

/**
 * V2 dialog service that fetches tickets from the backend and normalizes them to the Dialog type.
 * For methods not yet v2-specific (messages, status, chunks, realtime), delegates to V1.
 */
export class DialogServiceV2 implements DialogService {
  private v1 = new DialogServiceV1();

  private async mutateTicketStatus(ticketId: string, mutation: string, responseKey: string): Promise<boolean> {
    const response = await apiClient.post<GraphQlResponse<Record<string, StatusMutationPayload>>>(
      API_ENDPOINTS.GRAPHQL,
      { query: mutation, variables: { input: { id: ticketId } } },
    );

    const data = extractGraphQlData(response);
    const payload = data[responseKey];

    if (payload.userErrors?.length) {
      throw new Error(payload.userErrors[0].message);
    }

    return true;
  }

  async fetchDialogs(params: FetchDialogsParams): Promise<DialogsPage> {
    const paginationVars: Record<string, unknown> = { limit: params.limit };
    if (params.cursor) {
      paginationVars.cursor = params.cursor;
    }

    // Map dialog status filters to ticket status filters
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
    return this.v1.fetchMessages(params);
  }

  async updateStatus(ticketId: string, status: DialogStatus): Promise<boolean> {
    const mapped = STATUS_TO_MUTATION[status];
    if (!mapped) {
      throw new Error(`Unsupported status transition: ${status}`);
    }
    return this.mutateTicketStatus(ticketId, mapped.mutation, mapped.key);
  }

  async sendMessage(dialogId: string, content: string, chatType: ChatType): Promise<void> {
    return this.v1.sendMessage(dialogId, content, chatType);
  }

  async approveRequest(requestId: string): Promise<void> {
    return this.v1.approveRequest(requestId);
  }

  async rejectRequest(requestId: string): Promise<void> {
    return this.v1.rejectRequest(requestId);
  }

  async archiveDialog(ticketId: string): Promise<boolean> {
    return this.mutateTicketStatus(ticketId, ARCHIVE_TICKET_MUTATION, 'archiveTicket');
  }

  async fetchChunks(dialogId: string, chatType: ChatType, fromSequenceId?: number | null): Promise<ChunkData[]> {
    return this.v1.fetchChunks(dialogId, chatType, fromSequenceId);
  }

  parseRealtimePayload(payload: unknown, messageType: NatsMessageType, dialogId: string): RealtimeAction | null {
    return this.v1.parseRealtimePayload(payload, messageType, dialogId);
  }
}
