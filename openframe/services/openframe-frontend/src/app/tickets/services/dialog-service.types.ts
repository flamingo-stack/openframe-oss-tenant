import type { ChunkData, NatsMessageType } from '@flamingo-stack/openframe-frontend-core';
import type { ChatType } from '../constants';
import type { CursorPageInfo, Dialog, DialogStatus, Message } from '../types/dialog.types';

export interface DialogsPage {
  dialogs: Dialog[];
  pageInfo: CursorPageInfo;
}

export interface MessagePage {
  messages: Message[];
  pageInfo: CursorPageInfo;
}

export interface FetchDialogsParams {
  statuses: string[];
  search?: string;
  cursor?: string;
  limit: number;
}

export interface FetchMessagesParams {
  dialogId: string;
  chatType: ChatType;
  cursor?: string;
  limit: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface DialogService {
  fetchDialogs(params: FetchDialogsParams): Promise<DialogsPage>;
  fetchDialog(id: string): Promise<Dialog | null>;
  fetchMessages(params: FetchMessagesParams): Promise<MessagePage>;
  updateStatus(dialogId: string, status: DialogStatus): Promise<boolean>;
  sendMessage(dialogId: string, content: string, chatType: ChatType): Promise<void>;
  approveRequest(requestId: string): Promise<void>;
  rejectRequest(requestId: string): Promise<void>;
  archiveDialog(dialogId: string): Promise<boolean>;
  fetchChunks(dialogId: string, chatType: ChatType, fromSequenceId?: number | null): Promise<ChunkData[]>;
  parseRealtimePayload(payload: unknown, messageType: NatsMessageType, dialogId: string): RealtimeAction | null;
}

export type RealtimeAction =
  | { type: 'message'; message: Message; isAdmin: boolean }
  | { type: 'stream_start'; isAdmin: boolean }
  | { type: 'stream_end'; isAdmin: boolean }
  | { type: 'error'; error: string; isAdmin: boolean }
  | { type: 'compaction_start'; message: Message; isAdmin: boolean }
  | { type: 'compaction_end'; message: Message; isAdmin: boolean }
  | {
      type: 'metadata';
      modelDisplayName: string;
      modelName: string;
      providerName: string;
      contextWindow: number;
      isAdmin: boolean;
    };
