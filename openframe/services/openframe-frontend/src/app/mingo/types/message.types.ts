import type { AssistantType, MessageContent } from '@flamingo-stack/openframe-frontend-core';
import type { ChatType, OwnerType } from '../../tickets/constants';

export interface GraphQlMessage {
  id: string;
  dialogId: string;
  chatType: ChatType;
  dialogMode: string;
  createdAt: string;
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
  name?: string;
  assistantType?: AssistantType;
  timestamp?: Date;
  avatar?: string | null;
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
