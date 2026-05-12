import type { ChunkData } from '@flamingo-stack/openframe-frontend-core';
import type { ChatType } from '../constants';
import type { CursorPageInfo, Dialog, DialogStatus, Message } from '../types/dialog.types';

export interface TicketsPage {
  dialogs: Dialog[];
  pageInfo: CursorPageInfo;
  filteredCount: number;
}

export interface MessagePage {
  messages: Message[];
  pageInfo: CursorPageInfo;
}

export interface FetchTicketsParams {
  statuses: string[];
  search?: string;
  organizationIds?: string[];
  assigneeIds?: string[];
  cursor?: string;
  limit: number;
}

export type BoardStatus = 'ACTIVE' | 'TECH_REQUIRED' | 'ON_HOLD' | 'RESOLVED';

export interface FetchTicketsBoardParams {
  search?: string;
  organizationIds?: string[];
  assigneeIds?: string[];
  limit: number;
}

export type TicketsBoardPage = Record<BoardStatus, TicketsPage>;

export interface ReorderTicketParams {
  id: string;
  afterTicketId: string | null;
  beforeTicketId: string | null;
  status?: BoardStatus;
}

export interface TicketStatusTransition {
  from: DialogStatus;
  to: DialogStatus[];
}

export interface FetchMessagesParams {
  dialogId: string;
  chatType: ChatType;
  cursor?: string;
  limit: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface TicketService {
  fetchDialogs(params: FetchTicketsParams): Promise<TicketsPage>;
  fetchTicketsBoard(params: FetchTicketsBoardParams): Promise<TicketsBoardPage>;
  fetchDialog(id: string): Promise<Dialog | null>;
  fetchMessages(params: FetchMessagesParams): Promise<MessagePage>;
  updateStatus(ticketId: string, status: DialogStatus): Promise<boolean>;
  reorderTicket(params: ReorderTicketParams): Promise<DialogStatus>;
  fetchTicketStatusTransitions(): Promise<TicketStatusTransition[]>;
  sendMessage(dialogId: string, content: string, chatType: ChatType): Promise<void>;
  approveRequest(requestId: string): Promise<void>;
  rejectRequest(requestId: string): Promise<void>;
  archiveDialog(ticketId: string): Promise<boolean>;
  fetchChunks(dialogId: string, chatType: ChatType, fromSequenceId?: number | null): Promise<ChunkData[]>;
}
