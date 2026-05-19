import type {
  MessageData as CoreMessageData,
  HistoricalMessage,
  MessageOwner,
} from '@flamingo-stack/openframe-frontend-core';
import { GraphQLClient, type RequestDocument, type Variables } from 'graphql-request';
import { tokenService } from './tokenService';

export interface DialogTokenUsage {
  inputTokensSize: number | null;
  outputTokensSize: number | null;
  totalTokensSize: number | null;
  contextSize: number | null;
}

interface DialogTokenUsageEntry extends DialogTokenUsage {
  chatType: string;
}

const CLIENT_CHAT_TYPE = 'CLIENT_CHAT';

function pickClientChatTokenUsage(entries: DialogTokenUsageEntry[] | null | undefined): DialogTokenUsage | null {
  if (!entries) return null;
  const match = entries.find(e => e.chatType === CLIENT_CHAT_TYPE);
  if (!match) return null;
  const { chatType: _chatType, ...usage } = match;
  return usage;
}

export type DialogOwner = MessageOwner;

export type MessageData = CoreMessageData;

export interface Message extends HistoricalMessage {
  dialogMode: string;
}

export interface MessageEdge {
  cursor: string;
  node: Message;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface MessagesConnection {
  edges: MessageEdge[];
  pageInfo: PageInfo;
}

const DIALOG_TOKEN_USAGE_QUERY = `
  query GetDialogById($id: ID!) {
    dialog(id: $id) {
      id
      tokenUsage {
        chatType
        inputTokensSize
        outputTokensSize
        totalTokensSize
        contextSize
      }
    }
  }
`;

const THINKING_FRAGMENT = `
            ... on ThinkingData {
              text
            }`;

function getDialogMessagesQuery({ includeThinking = false } = {}) {
  return `
  query GetAllMessages($dialogId: ID!, $chatType: ChatType, $cursor: String, $limit: Int, $sortField: String, $sortDirection: SortDirection) {
    messages(
      dialogId: $dialogId
      chatType: $chatType
      pagination: { cursor: $cursor, limit: $limit }
      sort: { field: $sortField, direction: $sortDirection }
    ) {
      edges {
        cursor
        node {
          id
          dialogId
          chatType
          dialogMode
          createdAt
          owner {
            type
            ... on AdminOwner {
              user {
                id
                firstName
                lastName
              }
            }
          }
          messageData {
            type
            ... on TextData {
              text
            }

            ${includeThinking ? THINKING_FRAGMENT : ''}

            ... on SystemData {
              text
            }

            ... on ExecutingToolData {
              type
              integratedToolType
              toolFunction
              title
              parameters
              requiresApproval
              approvalStatus
              toolExecutionRequestId
            }

            ... on ExecutedToolData {
              type
              integratedToolType
              toolFunction
              result
              success
              requiredApproval
              approvalStatus
              toolExecutionRequestId
            }

            ... on ApprovalRequestData {
              type
              approvalRequestId
              approvalType
              command
              explanation
              toolCalls {
                toolExecutionRequestId
                toolName
                toolTitle
                toolExplanation
                toolType
                requiresApproval
                approvalType
                toolCallArguments
              }
            }

            ... on ApprovalResultData {
              type
              approvalRequestId
              approved
              approvalType
            }

            ... on ContextCompactionStartData {
              type
            }

            ... on ContextCompactionEndData {
              type
              summary
            }

            ... on ErrorData {
              error
              details
            }
          }
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
}

export class DialogGraphQlService {
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

  async getDialogMessagesPage(
    dialogId: string,
    cursor?: string | null,
    limit: number = 50,
    { includeThinking = false } = {},
  ): Promise<MessagesConnection | null> {
    try {
      await tokenService.ensureTokenReady();

      const data = await this.request<{ messages: MessagesConnection }>(
        getDialogMessagesQuery({ includeThinking }),
        {
          dialogId,
          chatType: 'CLIENT_CHAT',
          cursor,
          limit,
          sortField: 'createdAt',
          sortDirection: 'DESC',
        },
      );

      return data.messages || null;
    } catch (error) {
      console.error('Failed to fetch dialog messages page:', error);
      return null;
    }
  }

  async getDialogTokenUsage(dialogId: string): Promise<DialogTokenUsage | null> {
    try {
      await tokenService.ensureTokenReady();
      const data = await this.request<{ dialog: { tokenUsage: DialogTokenUsageEntry[] | null } | null }>(
        DIALOG_TOKEN_USAGE_QUERY,
        { id: dialogId },
      );
      return pickClientChatTokenUsage(data.dialog?.tokenUsage);
    } catch (error) {
      console.error('Failed to fetch dialog token usage:', error);
      return null;
    }
  }

  dispose(): void {
    this.graphQlClient = null;
    this.currentEndpoint = null;
  }
}

export const dialogGraphQlService = new DialogGraphQlService();
