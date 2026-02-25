import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { MESSAGE_TYPE, OWNER_TYPE } from '../constants';
import { GET_DIALOG_MESSAGES_QUERY, GET_DIALOG_QUERY } from '../queries/dialogs-queries';
import { Dialog, Message, MessageConnection } from '../types/dialog.types';

interface DialogResponse {
  dialog: Dialog;
}

interface MessagesResponse {
  messages: MessageConnection;
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

interface DialogDetailsStore {
  // Current dialog state
  currentDialogId: string | null;
  currentDialog: Dialog | null;
  currentMessages: Message[];
  adminMessages: Message[];

  // Loading states
  isLoadingDialog: boolean;
  isLoadingMessages: boolean;
  loadingDialogId: string | null;
  loadingMessagesId: string | null;

  // Error states
  dialogError: string | null;
  messagesError: string | null;

  // Pagination
  hasMoreMessages: boolean;
  messagesCursor: string | null;
  newestMessageCursor: string | null;

  // Typing indicators
  isClientChatTyping: boolean;
  isAdminChatTyping: boolean;

  // Actions
  fetchDialog: (dialogId: string) => Promise<Dialog | null>;
  fetchMessages: (dialogId: string, append?: boolean, pollNew?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  clearCurrent: () => void;
  updateDialogStatus: (status: string) => void;
  addRealtimeMessage: (message: Message, isAdmin: boolean) => void;
  setTypingIndicator: (isAdmin: boolean, typing: boolean) => void;
}

export const useDialogDetailsStore = create<DialogDetailsStore>((set, get) => ({
  currentDialogId: null,
  currentDialog: null,
  currentMessages: [],
  adminMessages: [],

  isLoadingDialog: false,
  isLoadingMessages: false,
  loadingDialogId: null,
  loadingMessagesId: null,

  dialogError: null,
  messagesError: null,

  hasMoreMessages: false,
  messagesCursor: null,
  newestMessageCursor: null,

  isClientChatTyping: false,
  isAdminChatTyping: false,

  fetchDialog: async (dialogId: string) => {
    const state = get();

    if (state.currentDialogId !== dialogId || state.currentDialog === null) {
      set({
        isLoadingDialog: true,
        loadingDialogId: dialogId,
        dialogError: null,
        currentDialogId: dialogId,
      });
    }

    try {
      const response = await apiClient.post<GraphQlResponse<DialogResponse>>('/chat/graphql', {
        query: GET_DIALOG_QUERY,
        variables: { id: dialogId },
      });

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`);
      }

      const dialog = response.data?.data?.dialog || null;

      set(s => ({
        currentDialog: dialog,
        isLoadingDialog: s.currentDialogId !== dialogId ? s.isLoadingDialog : false,
        loadingDialogId: s.currentDialogId !== dialogId ? s.loadingDialogId : null,
        dialogError: dialog ? null : 'Dialog not found',
      }));

      return dialog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dialog';
      set({
        dialogError: errorMessage,
        isLoadingDialog: false,
        loadingDialogId: null,
        currentDialog: null,
      });
      throw error;
    }
  },

  fetchMessages: async (dialogId: string, append = false, pollNew = false) => {
    const state = get();

    if (state.isLoadingMessages && state.loadingMessagesId === dialogId) {
      return;
    }

    if (!append && !pollNew) {
      set({
        isLoadingMessages: true,
        loadingMessagesId: dialogId,
        messagesError: null,
      });
    }

    try {
      if (pollNew) {
        const response = await apiClient.post<GraphQlResponse<MessagesResponse>>('/chat/graphql', {
          query: GET_DIALOG_MESSAGES_QUERY,
          variables: {
            dialogId,
            cursor: state.newestMessageCursor,
            limit: 10,
          },
        });

        if (!response.ok) {
          throw new Error(response.error || `Request failed with status ${response.status}`);
        }

        const graphqlResponse = response.data;

        if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
          throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred');
        }

        const connection = graphqlResponse?.data?.messages;
        const newMessages = (connection?.edges || []).map(edge => edge.node);

        set(s => {
          const clientMessages = newMessages.filter(m => m.chatType === 'CLIENT_CHAT');
          const adminMessages = newMessages.filter(m => m.chatType === 'ADMIN_AI_CHAT');

          // For client messages
          const existingClientIds = new Set(s.currentMessages.map(m => m.id));
          const uniqueNewClient = clientMessages.filter(m => !existingClientIds.has(m.id));

          // For admin messages
          const existingAdminIds = new Set(s.adminMessages.map(m => m.id));
          const uniqueNewAdmin = adminMessages.filter(m => !existingAdminIds.has(m.id));

          let newNewestCursor = s.newestMessageCursor;
          let updatedClientMessages = s.currentMessages;
          let updatedAdminMessages = s.adminMessages;

          if (uniqueNewClient.length > 0 || uniqueNewAdmin.length > 0) {
            updatedClientMessages = [...s.currentMessages, ...uniqueNewClient];
            updatedAdminMessages = [...s.adminMessages, ...uniqueNewAdmin];

            if (connection?.edges && connection.edges.length > 0) {
              newNewestCursor = connection.edges[connection.edges.length - 1].cursor;
            }
          }

          return {
            currentMessages: updatedClientMessages,
            adminMessages: updatedAdminMessages,
            newestMessageCursor: newNewestCursor,
            isLoadingMessages: false,
            loadingMessagesId: null,
          };
        });
        return;
      }

      let allClientMessages: Message[] = [];
      let allAdminMessages: Message[] = [];
      let currentCursor: string | null = append ? state.messagesCursor : null;
      let hasNextPage = true;
      let newestCursor: string | null = state.newestMessageCursor;

      while (hasNextPage) {
        const response = await apiClient.post<GraphQlResponse<MessagesResponse>>('/chat/graphql', {
          query: GET_DIALOG_MESSAGES_QUERY,
          variables: {
            dialogId,
            cursor: currentCursor,
            limit: 100,
          },
        });

        if (!response.ok) {
          throw new Error(response.error || `Request failed with status ${response.status}`);
        }

        const graphqlResponse = response.data;

        if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
          throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred');
        }

        const connection = graphqlResponse?.data?.messages;
        const batchMessages = (connection?.edges || []).map(edge => edge.node);

        const batchClientMessages = batchMessages.filter(m => m.chatType === 'CLIENT_CHAT');
        const batchAdminMessages = batchMessages.filter(m => m.chatType === 'ADMIN_AI_CHAT');

        allClientMessages = [...allClientMessages, ...batchClientMessages];
        allAdminMessages = [...allAdminMessages, ...batchAdminMessages];

        if (!currentCursor && connection?.edges && connection.edges.length > 0) {
          newestCursor = connection.edges[connection.edges.length - 1].cursor;
        }

        hasNextPage = connection?.pageInfo?.hasNextPage || false;
        currentCursor = connection?.pageInfo?.endCursor || null;
      }

      set(s => {
        let updatedClientMessages: Message[];
        let updatedAdminMessages: Message[];

        if (append) {
          const existingClientIds = new Set(s.currentMessages.map(m => m.id));
          const uniqueNewClient = allClientMessages.filter(m => !existingClientIds.has(m.id));
          updatedClientMessages = uniqueNewClient.length
            ? [...s.currentMessages, ...uniqueNewClient]
            : s.currentMessages;

          const existingAdminIds = new Set(s.adminMessages.map(m => m.id));
          const uniqueNewAdmin = allAdminMessages.filter(m => !existingAdminIds.has(m.id));
          updatedAdminMessages = uniqueNewAdmin.length ? [...s.adminMessages, ...uniqueNewAdmin] : s.adminMessages;
        } else {
          updatedClientMessages = allClientMessages;
          updatedAdminMessages = allAdminMessages;
        }

        return {
          currentMessages: updatedClientMessages,
          adminMessages: updatedAdminMessages,
          hasMoreMessages: false,
          messagesCursor: null,
          newestMessageCursor: newestCursor,
          isLoadingMessages: false,
          loadingMessagesId: null,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
      set({
        messagesError: errorMessage,
        isLoadingMessages: false,
        loadingMessagesId: null,
      });
      throw error;
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.currentDialogId && state.hasMoreMessages && !state.isLoadingMessages) {
      return state.fetchMessages(state.currentDialogId, true);
    }
  },

  clearCurrent: () =>
    set({
      currentDialogId: null,
      currentDialog: null,
      currentMessages: [],
      adminMessages: [],
      messagesCursor: null,
      newestMessageCursor: null,
      hasMoreMessages: false,
      dialogError: null,
      messagesError: null,
      loadingDialogId: null,
      loadingMessagesId: null,
      isClientChatTyping: false,
      isAdminChatTyping: false,
    }),

  updateDialogStatus: (status: string) => {
    const state = get();
    if (state.currentDialog) {
      set({
        currentDialog: {
          ...state.currentDialog,
          status: status as any,
        },
      });
    }
  },

  addRealtimeMessage: (message: Message, isAdmin: boolean) => {
    const state = get();
    if (!state.currentDialogId || message.dialogId !== state.currentDialogId) return;

    const TEXT_TYPE = MESSAGE_TYPE.TEXT;
    const ASSISTANT_TYPE = OWNER_TYPE.ASSISTANT;

    const isTextMessage = message.messageData?.type === TEXT_TYPE;
    const isAssistantOwner = message.owner?.type === ASSISTANT_TYPE;

    const updateMessages = (messages: Message[], isTextMsg: boolean, isAssistant: boolean): Message[] => {
      const existingIds = new Set(messages.map(m => m.id));
      if (existingIds.has(message.id)) return messages;

      if (isTextMsg && messages.length > 0 && isAssistant) {
        const lastMessage = messages[messages.length - 1];
        const lastIsText = lastMessage.messageData?.type === TEXT_TYPE;
        const lastIsAssistant = lastMessage.owner?.type === ASSISTANT_TYPE;

        if (lastIsText && lastIsAssistant) {
          const updatedMessages = [...messages];
          const lastMessageData = lastMessage.messageData as any;
          const messageData = message.messageData as any;
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            messageData: {
              ...lastMessage.messageData,
              text: (lastMessageData.text || '') + (messageData.text || ''),
            },
          };
          return updatedMessages;
        }
      }

      return [...messages, message];
    };

    if (isAdmin) {
      set(s => ({ adminMessages: updateMessages(s.adminMessages, isTextMessage, isAssistantOwner) }));
    } else {
      set(s => ({ currentMessages: updateMessages(s.currentMessages, isTextMessage, isAssistantOwner) }));
    }
  },

  setTypingIndicator: (isAdmin: boolean, typing: boolean) => {
    set(isAdmin ? { isAdminChatTyping: typing } : { isClientChatTyping: typing });
  },
}));
