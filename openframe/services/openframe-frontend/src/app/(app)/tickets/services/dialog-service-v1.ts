import type { ChunkData } from '@flamingo-stack/openframe-frontend-core';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { API_ENDPOINTS } from '../constants';
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
}
