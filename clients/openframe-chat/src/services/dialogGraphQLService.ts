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
  lastChunkStreamSeq?: number | null;
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

const DIALOG_TICKET_ID_QUERY = `
  query GetDialogTicketId($id: ID!) {
    dialog(id: $id) {
      id
      ticketId
    }
  }
`;

/**
 * Response keys the escalation bodies are aliased to. Both types declare
 * `text` as nullable, so both need an alias — see the note on the query below.
 */
const OFFER_TEXT_ALIAS = 'offerText';
const ESCALATED_TEXT_ALIAS = 'escalatedText';
const ESCALATION_TEXT_ALIASES = [OFFER_TEXT_ALIAS, ESCALATED_TEXT_ALIAS] as const;

/**
 * Restores an aliased body onto the `text` field the shared decoder expects,
 * keeping the alias a detail of THIS transport rather than something the core
 * library's persisted-row contract has to know about.
 */
function normalizeEscalationText(connection: MessagesConnection): MessagesConnection {
  for (const edge of connection.edges) {
    const messageData = edge.node.messageData;
    if (!messageData) continue;
    for (const data of Array.isArray(messageData) ? messageData : [messageData]) {
      const row = data as unknown as Record<string, unknown>;
      for (const alias of ESCALATION_TEXT_ALIASES) {
        if (typeof row[alias] === 'string') row.text = row[alias];
      }
    }
  }
  return connection;
}

/**
 * `includeEscalationOffers` gates the ESCALATION_OFFER selection on the
 * `ai-escalation` flag — the same switch that gates the backend half. Without
 * the gate, an inline fragment on a type the server's schema doesn't declare
 * fails validation for the WHOLE query, and the caller turns that into an empty
 * page — blanking every conversation on tenants without the escalation build.
 *
 * Both escalation bodies MUST stay aliased. Every other `*Data.text` here is
 * `String!` while `EscalationOfferData.text` and `TicketEscalatedData.text` are
 * nullable, and GraphQL's SameResponseShape rule compares response keys across
 * the whole selection set — non-overlapping types included — so sharing the key
 * `text` is a FieldsConflict that invalidates the entire query.
 */
function getDialogMessagesQuery(includeEscalationOffers: boolean) {
  const escalationOfferFragment = includeEscalationOffers
    ? `
            ... on EscalationOfferData {
              type
              offerId
              state
              ${OFFER_TEXT_ALIAS}: text
              origin
              resolvedByName
            }

            ... on TicketEscalatedData {
              type
              ticketId
              ticketNumber
              reason
              ${ESCALATED_TEXT_ALIAS}: text
            }
`
    : '';
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
          lastChunkStreamSeq
          owner {
            type
            ... on AdminOwner {
              user {
                id
                firstName
                lastName
              }
            }
            ... on AssistantOwner {
              model
              modelName
              providerName
              contextWindow
            }
          }
          messageData {
            type
            ... on TextData {
              text
            }

            ... on ThinkingData {
              text
            }

            ... on SystemData {
              text
            }

            ... on ExecutingToolData {
              type
              integratedToolType
              toolFunction
              title
              toolExplanation
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
              resolvedByName
            }

${escalationOfferFragment}
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
    includeEscalationOffers: boolean = false,
  ): Promise<MessagesConnection | null> {
    try {
      await tokenService.ensureTokenReady();

      const data = await this.request<{ messages: MessagesConnection }>(
        getDialogMessagesQuery(includeEscalationOffers),
        {
          dialogId,
          chatType: 'CLIENT_CHAT',
          cursor,
          limit,
          sortField: 'createdAt',
          sortDirection: 'DESC',
        },
      );

      if (!data.messages) return null;
      return includeEscalationOffers ? normalizeEscalationText(data.messages) : data.messages;
    } catch (error) {
      console.error('Failed to fetch dialog messages page:', error);
      return null;
    }
  }

  /**
   * The dialog's linked ticket (1:1). Needed because escalation is a
   * ticket-domain operation while a chat started this session only knows its
   * dialog id.
   *
   * `null` means the dialog carries no ticket. Transport and GraphQL failures
   * PROPAGATE so the caller's query can retry — folding them into `null` made a
   * transient blip indistinguishable from "no ticket" and permanently disabled
   * escalation for the dialog.
   */
  async getDialogTicketId(dialogId: string): Promise<string | null> {
    await tokenService.ensureTokenReady();
    const data = await this.request<{ dialog: { ticketId: string | null } | null }>(DIALOG_TICKET_ID_QUERY, {
      id: dialogId,
    });
    return data.dialog?.ticketId ?? null;
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
