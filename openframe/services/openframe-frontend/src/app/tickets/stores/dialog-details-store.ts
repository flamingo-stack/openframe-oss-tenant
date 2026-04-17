import { create } from 'zustand';
import { MESSAGE_TYPE, OWNER_TYPE } from '../constants';
import { getDialogService } from '../services';
import type { Dialog, Message } from '../types/dialog.types';

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
  fetchDialog: (dialogId: string, version?: 'v1' | 'v2') => Promise<Dialog | null>;
  clearCurrent: () => void;
  updateDialogStatus: (status: string) => void;
  updateDialogMode: (mode: string, dialogId?: string) => void;
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

  fetchDialog: async (dialogId: string, version: 'v1' | 'v2' = 'v1') => {
    const state = get();
    const service = getDialogService(version);

    if (state.currentDialogId !== dialogId || state.currentDialog === null) {
      set({
        isLoadingDialog: true,
        loadingDialogId: dialogId,
        dialogError: null,
        currentDialogId: dialogId,
      });
    }

    try {
      const dialog = await service.fetchDialog(dialogId);

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

  updateDialogMode: (mode: string, dialogId?: string) => {
    const state = get();
    if (state.currentDialog) {
      set({
        currentDialog: {
          ...state.currentDialog,
          currentMode: mode,
          ...(dialogId ? { dialogId } : {}),
        },
      });
    }
  },

  addRealtimeMessage: (message: Message, isAdmin: boolean) => {
    const state = get();
    const matchId = state.currentDialog?.dialogId ?? state.currentDialogId;
    if (!matchId || message.dialogId !== matchId) return;

    const TEXT_TYPE = MESSAGE_TYPE.TEXT;
    const ASSISTANT_TYPE = OWNER_TYPE.ASSISTANT;
    const COMPACTION_START_TYPE = 'CONTEXT_COMPACTION_START';
    const COMPACTION_END_TYPE = 'CONTEXT_COMPACTION_END';

    const incomingType = message.messageData?.type;
    const isTextMessage = incomingType === TEXT_TYPE;
    const isAssistantOwner = message.owner?.type === ASSISTANT_TYPE;
    const isCompactionStart = incomingType === COMPACTION_START_TYPE;
    const isCompactionEnd = incomingType === COMPACTION_END_TYPE;

    const updateMessages = (messages: Message[], isTextMsg: boolean, isAssistant: boolean): Message[] => {
      const existingIds = new Set(messages.map(m => m.id));
      if (existingIds.has(message.id)) return messages;

      if (isCompactionStart) {
        const hasExistingCompaction = messages.some(
          m => m.messageData?.type === COMPACTION_START_TYPE || m.messageData?.type === COMPACTION_END_TYPE,
        );
        if (hasExistingCompaction) return messages;
        return [...messages, message];
      }

      if (isCompactionEnd) {
        const lastEndIdx = (() => {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].messageData?.type === COMPACTION_END_TYPE) return i;
          }
          return -1;
        })();
        if (lastEndIdx !== -1) return messages;

        const lastStartIdx = (() => {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].messageData?.type === COMPACTION_START_TYPE) return i;
          }
          return -1;
        })();
        if (lastStartIdx !== -1) {
          const updated = [...messages];
          updated[lastStartIdx] = message;
          return updated;
        }
        return [...messages, message];
      }

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
