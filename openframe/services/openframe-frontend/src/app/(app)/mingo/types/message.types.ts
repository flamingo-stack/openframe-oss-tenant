import type { AssistantType, AuthorType, MessageContent } from '@flamingo-stack/openframe-frontend-core';
import type { ChatContextItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import type { ChatType, OwnerType } from '../../tickets/constants';

export interface GraphQlMessage {
  id: string;
  dialogId: string;
  chatType: ChatType;
  dialogMode: string;
  createdAt: string;
  lastChunkStreamSeq?: number | null;
  owner: {
    type: OwnerType;
    model?: string;
  };
  messageData: any;
}

export interface CoreMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: MessageContent;
  authorType?: AuthorType;
  name?: string;
  assistantType?: AssistantType;
  timestamp?: Date;
  avatar?: string | null;
  /** Highest content chunk streamSeq that composed this message; stamped on
   *  realtime synthetics for per-message history-coverage dedup. */
  streamSeq?: number;
  /** Entity-context items attached to this (user) message via the composer's
   *  context picker. Rendered as read-only chips under the bubble. */
  contextItems?: ChatContextItem[];
}

export type Message = CoreMessage;

export interface MessageConnection {
  edges: Array<{
    cursor: string;
    node: GraphQlMessage;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

export interface MessagesResponse {
  data: {
    messages: MessageConnection;
  };
}

export interface MessagePage {
  messages: GraphQlMessage[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

export function isGraphQlMessage(message: any): message is GraphQlMessage {
  return 'messageData' in message;
}

export function isCoreMessage(message: any): message is CoreMessage {
  return 'content' in message;
}
