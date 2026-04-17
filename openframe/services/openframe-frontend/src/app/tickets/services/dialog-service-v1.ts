import type { ChunkData, NatsMessageType } from '@flamingo-stack/openframe-frontend-core';
import { parseChunkToAction } from '@flamingo-stack/openframe-frontend-core';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { API_ENDPOINTS, CHAT_TYPE } from '../constants';
import { GET_DIALOGS_QUERY, getDialogMessagesQuery, getDialogQuery } from '../queries/dialogs-queries';
import type { Dialog, DialogStatus, Message } from '../types/dialog.types';
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

export class DialogServiceV1 implements DialogService {
  async fetchDialogs(params: FetchDialogsParams): Promise<DialogsPage> {
    const paginationVars: Record<string, unknown> = { limit: params.limit };
    if (params.cursor) {
      paginationVars.cursor = params.cursor;
    }

    const response = await apiClient.post<
      GraphQlResponse<{
        dialogs: { edges: Array<{ cursor: string; node: Dialog }>; pageInfo: DialogsPage['pageInfo'] };
      }>
    >('/chat/graphql', {
      query: GET_DIALOGS_QUERY,
      variables: {
        filter: { statuses: params.statuses, agentTypes: ['CLIENT'] },
        pagination: paginationVars,
        search: params.search || undefined,
      },
    });

    const data = extractGraphQlData(response);
    const connection = data.dialogs;

    return {
      dialogs: (connection?.edges || []).map(edge => edge.node),
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
    const response = await apiClient.post<GraphQlResponse<{ dialog: Dialog }>>('/chat/graphql', {
      query: getDialogQuery({ includeTokenUsage }),
      variables: { id },
    });

    const data = extractGraphQlData(response);
    return data.dialog || null;
  }

  async fetchMessages(params: FetchMessagesParams): Promise<MessagePage> {
    const includeContextCompaction = featureFlags.tokenBasedMemory.enabled();
    const response = await apiClient.post<
      GraphQlResponse<{
        messages: { edges: Array<{ cursor: string; node: Message }>; pageInfo: MessagePage['pageInfo'] };
      }>
    >('/chat/graphql', {
      query: getDialogMessagesQuery({ includeContextCompaction }),
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

  async updateStatus(dialogId: string, status: DialogStatus): Promise<boolean> {
    const response = await apiClient.patch(`/chat/api/v1/dialogs/${dialogId}/status`, { status });

    if (!response.ok) {
      throw new Error(response.error || 'Failed to update dialog status');
    }

    return true;
  }

  async sendMessage(dialogId: string, content: string, chatType: string): Promise<void> {
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

  async archiveDialog(dialogId: string): Promise<boolean> {
    const response = await apiClient.patch(`/chat/api/v1/dialogs/${dialogId}/status`, {
      status: 'ARCHIVED',
    });

    return response.ok;
  }

  async fetchChunks(dialogId: string, chatType: string, fromSequenceId?: number | null): Promise<ChunkData[]> {
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

  parseRealtimePayload(payload: unknown, messageType: NatsMessageType, dialogId: string): RealtimeAction | null {
    const asAny = payload as any;
    const isAdmin = messageType === 'admin-message';
    const chatType = isAdmin ? CHAT_TYPE.ADMIN : CHAT_TYPE.CLIENT;
    const nowIso = new Date().toISOString();

    // Check if it's a full message object (not a chunk)
    const isMessageObject =
      asAny &&
      typeof asAny === 'object' &&
      typeof asAny.id === 'string' &&
      typeof asAny.dialogId === 'string' &&
      asAny.messageData != null &&
      asAny.owner != null;

    if (isMessageObject) {
      const message = asAny as Message;
      if (message.dialogId !== dialogId) return null;

      const isAdminMessage = message.chatType === CHAT_TYPE.ADMIN;
      return { type: 'message', message, isAdmin: isAdminMessage };
    }

    const action = parseChunkToAction(payload);
    if (!action) return null;

    if (action.action === 'message_start') {
      return { type: 'stream_start', isAdmin };
    }

    if (action.action === 'message_end') {
      return { type: 'stream_end', isAdmin };
    }

    if (action.action === 'error') {
      return { type: 'error', error: action.error, isAdmin };
    }

    if (action.action === 'metadata') {
      return {
        type: 'metadata',
        modelDisplayName: action.modelDisplayName,
        modelName: action.modelName,
        providerName: action.providerName,
        contextWindow: action.contextWindow,
        isAdmin,
      };
    }

    const id = `nats-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createBaseMessage = (isUserMessage: boolean): Message => {
      let owner: any;
      if (isUserMessage) {
        owner = isAdmin ? { type: 'ADMIN' as const, userId: '' } : { type: 'CLIENT' as const, machineId: '' };
      } else {
        owner = { type: 'ASSISTANT' as const, model: '' };
      }

      return {
        id,
        dialogId,
        chatType: chatType as any,
        dialogMode: 'DEFAULT',
        createdAt: nowIso,
        owner: owner as any,
        messageData: { type: 'TEXT', text: '' } as any,
      };
    };

    let message: Message | null = null;

    switch (action.action) {
      case 'message_request': {
        const isAdminRequest = action.ownerType === 'ADMIN' || isAdmin;
        const owner = isAdminRequest
          ? {
              type: 'ADMIN' as const,
              userId: '',
              user: action.displayName ? { id: '', firstName: action.displayName } : undefined,
            }
          : { type: 'CLIENT' as const, machineId: '' };
        message = {
          id,
          dialogId,
          chatType: chatType as any,
          dialogMode: 'DEFAULT',
          createdAt: nowIso,
          owner: owner as any,
          messageData: { type: 'TEXT', text: action.text } as any,
        };
        break;
      }

      case 'text':
        message = {
          ...createBaseMessage(false),
          messageData: { type: 'TEXT', text: action.text } as any,
        };
        break;

      case 'tool_execution': {
        const toolData = action.segment.data;
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: toolData.type,
            integratedToolType: toolData.integratedToolType,
            toolFunction: toolData.toolFunction,
            parameters: toolData.parameters,
            result: toolData.result,
            success: toolData.success,
          } as any,
        };
        break;
      }

      case 'approval_request':
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: 'APPROVAL_REQUEST',
            approvalType: action.approvalType,
            command: action.command,
            approvalRequestId: action.requestId,
            explanation: action.explanation,
          } as any,
        };
        break;

      case 'approval_result':
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: 'APPROVAL_RESULT',
            approvalRequestId: action.requestId,
            approved: action.approved,
            approvalType: action.approvalType,
          } as any,
        };
        break;

      case 'direct_message': {
        const isAdminAuthor = action.ownerType === 'ADMIN';
        const owner = isAdminAuthor
          ? {
              type: 'ADMIN' as const,
              userId: '',
              user: action.displayName ? { id: '', firstName: action.displayName } : undefined,
            }
          : { type: 'CLIENT' as const, machineId: '' };
        message = {
          id,
          dialogId,
          chatType: chatType as any,
          dialogMode: 'DIRECT',
          createdAt: nowIso,
          owner: owner as any,
          messageData: { type: 'TEXT', text: action.text } as any,
        };
        break;
      }

      case 'system':
        message = {
          ...createBaseMessage(false),
          messageData: { type: 'SYSTEM', text: action.text } as any,
        };
        break;

      case 'context_compaction_start':
        return {
          type: 'compaction_start',
          message: {
            ...createBaseMessage(false),
            messageData: { type: 'CONTEXT_COMPACTION_START' } as any,
          },
          isAdmin,
        };

      case 'context_compaction_end':
        return {
          type: 'compaction_end',
          message: {
            ...createBaseMessage(false),
            messageData: { type: 'CONTEXT_COMPACTION_END', summary: action.summary } as any,
          },
          isAdmin,
        };

      default:
        return null;
    }

    if (message) {
      return { type: 'message', message, isAdmin };
    }

    return null;
  }
}
