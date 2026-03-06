import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { MESSAGE_TYPE, OWNER_TYPE } from '../constants';
import { GET_DIALOG_QUERY } from '../queries/dialogs-queries';
import type { Dialog, Message } from '../types/dialog.types';

interface DialogResponse {
  dialog: Dialog;
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
  loadingDialogId: string | null;

  // Error states
  dialogError: string | null;

  // Typing indicators
  isClientChatTyping: boolean;
  isAdminChatTyping: boolean;

  // Actions
  fetchDialog: (dialogId: string) => Promise<Dialog | null>;
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
  loadingDialogId: null,

  dialogError: null,

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

  clearCurrent: () =>
    set({
      currentDialogId: null,
      currentDialog: null,
      currentMessages: [],
      adminMessages: [],
      dialogError: null,
      loadingDialogId: null,
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
