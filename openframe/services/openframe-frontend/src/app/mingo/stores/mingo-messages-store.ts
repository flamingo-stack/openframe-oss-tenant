import type { MessageSegment } from '@flamingo-stack/openframe-frontend-core';
import {
  createMessageSegmentAccumulator,
  type MessageSegmentAccumulator,
} from '@flamingo-stack/openframe-frontend-core';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DialogNode, Message } from '../types';

interface MingoMessagesStore {
  // Unified message storage - key is dialogId
  messagesByDialog: Map<string, Message[]>;

  // Dialog state
  activeDialogId: string | null;
  dialogs: DialogNode[];

  // Real-time state management
  typingStates: Map<string, boolean>;
  unreadCounts: Map<string, number>;
  streamingMessages: Map<string, Message | null>; // Track streaming messages per dialog
  segmentAccumulators: Map<string, MessageSegmentAccumulator>; // Track segment accumulators per dialog

  // Loading states
  isLoadingDialog: boolean;
  isLoadingMessages: boolean;
  isCreatingDialog: boolean;

  // Error states
  dialogError: string | null;
  messagesError: string | null;

  // Pagination
  hasMoreMessages: boolean;
  messagesCursor: string | null;
  newestMessageCursor: string | null;

  // Core Actions
  setActiveDialogId: (dialogId: string | null) => void;
  setDialogs: (dialogs: DialogNode[]) => void;

  // Message Management
  setMessages: (dialogId: string, messages: Message[]) => void;
  addMessage: (dialogId: string, message: Message) => void;
  updateMessage: (dialogId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (dialogId: string, messageId: string) => void;
  updateApprovalStatusInMessages: (dialogId: string, requestId: string, status: 'approved' | 'rejected') => void;
  getMessages: (dialogId: string) => Message[];

  // Real-time State Management
  setTyping: (dialogId: string, typing: boolean) => void;
  getTyping: (dialogId: string) => boolean;
  incrementUnread: (dialogId: string) => void;
  resetUnread: (dialogId: string) => void;
  getUnread: (dialogId: string) => number;

  // Streaming Messages
  setStreamingMessage: (dialogId: string, message: Message | null) => void;
  getStreamingMessage: (dialogId: string) => Message | null;
  updateStreamingMessageSegments: (dialogId: string, segments: MessageSegment[]) => void;

  // Segment Accumulators
  getOrCreateAccumulator: (
    dialogId: string,
    approvalHandlers?: { onApprove?: (requestId?: string) => void; onReject?: (requestId?: string) => void },
  ) => MessageSegmentAccumulator;
  resetAccumulator: (dialogId: string) => void;
  updateAccumulatorApprovalStatus: (dialogId: string, requestId: string, status: 'approved' | 'rejected') => void;

  // Utility Actions
  removeWelcomeMessages: (dialogId: string) => void;
  clearDialog: (dialogId: string) => void;
  resetAll: () => void;

  // Loading States
  setLoadingDialog: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  setCreatingDialog: (creating: boolean) => void;

  // Error States
  setDialogError: (error: string | null) => void;
  setMessagesError: (error: string | null) => void;

  // Pagination
  setPagination: (hasMore: boolean, cursor: string | null, newestCursor: string | null) => void;
}

export const useMingoMessagesStore = create<MingoMessagesStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      messagesByDialog: new Map(),
      activeDialogId: null,
      dialogs: [],
      typingStates: new Map(),
      unreadCounts: new Map(),
      streamingMessages: new Map(),
      segmentAccumulators: new Map(),

      isLoadingDialog: false,
      isLoadingMessages: false,
      isCreatingDialog: false,

      dialogError: null,
      messagesError: null,

      hasMoreMessages: false,
      messagesCursor: null,
      newestMessageCursor: null,

      // Core Actions
      setActiveDialogId: (dialogId: string | null) => {
        set({ activeDialogId: dialogId });
      },

      setDialogs: (dialogs: DialogNode[]) => {
        set({ dialogs });
      },

      // Message Management
      setMessages: (dialogId: string, messages: Message[]) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          newMap.set(dialogId, messages);
          return { messagesByDialog: newMap };
        });
      },

      addMessage: (dialogId: string, message: Message) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];

          const existingIndex = currentMessages.findIndex(msg => msg.id === message.id);
          if (existingIndex !== -1) {
            const updatedMessages = [...currentMessages];
            updatedMessages[existingIndex] = message;
            newMap.set(dialogId, updatedMessages);
          } else {
            newMap.set(dialogId, [...currentMessages, message]);
          }

          return { messagesByDialog: newMap };
        });
      },

      updateMessage: (dialogId: string, messageId: string, updates: Partial<Message>) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];

          const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            const updatedMessages = [...currentMessages];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };
            newMap.set(dialogId, updatedMessages);
          }

          return { messagesByDialog: newMap };
        });
      },

      removeMessage: (dialogId: string, messageId: string) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];
          const filteredMessages = currentMessages.filter(msg => msg.id !== messageId);
          newMap.set(dialogId, filteredMessages);
          return { messagesByDialog: newMap };
        });
      },

      updateApprovalStatusInMessages: (dialogId: string, requestId: string, status: 'approved' | 'rejected') => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];

          const updatedMessages = currentMessages.map(message => {
            if (message.role === 'assistant' && Array.isArray(message.content)) {
              const updatedContent = message.content.map(segment => {
                if (segment.type === 'approval_request' && segment.data?.requestId === requestId) {
                  return { ...segment, status };
                }
                return segment;
              });
              return { ...message, content: updatedContent };
            }
            return message;
          });

          newMap.set(dialogId, updatedMessages);
          return { messagesByDialog: newMap };
        });
      },

      getMessages: (dialogId: string) => {
        const state = get();
        return state.messagesByDialog.get(dialogId) || [];
      },

      setTyping: (dialogId: string, typing: boolean) => {
        set(state => {
          const newMap = new Map(state.typingStates);
          newMap.set(dialogId, typing);
          return { typingStates: newMap };
        });
      },

      getTyping: (dialogId: string) => {
        const state = get();
        return state.typingStates.get(dialogId) || false;
      },

      incrementUnread: (dialogId: string) => {
        set(state => {
          if (state.activeDialogId === dialogId) return state;

          const newMap = new Map(state.unreadCounts);
          const currentCount = newMap.get(dialogId) || 0;
          newMap.set(dialogId, currentCount + 1);
          return { unreadCounts: newMap };
        });
      },

      resetUnread: (dialogId: string) => {
        set(state => {
          const newMap = new Map(state.unreadCounts);
          newMap.set(dialogId, 0);
          return { unreadCounts: newMap };
        });
      },

      getUnread: (dialogId: string) => {
        const state = get();
        return state.unreadCounts.get(dialogId) || 0;
      },

      setStreamingMessage: (dialogId: string, message: Message | null) => {
        set(state => {
          const newMap = new Map(state.streamingMessages);
          newMap.set(dialogId, message);
          return { streamingMessages: newMap };
        });
      },

      getStreamingMessage: (dialogId: string) => {
        const state = get();
        return state.streamingMessages.get(dialogId) || null;
      },

      updateStreamingMessageSegments: (dialogId: string, segments: MessageSegment[]) => {
        set(state => {
          const currentStreaming = state.streamingMessages.get(dialogId);
          if (!currentStreaming) return state;

          const accumulator = state.segmentAccumulators.get(dialogId);
          if (!accumulator) {
            console.warn('[MingoStore] No accumulator found for dialog:', dialogId);
            return state;
          }

          // Process segments through accumulator
          accumulator.reset();
          segments.forEach(segment => {
            if (segment.type === 'text' && segment.text) {
              accumulator.appendText(segment.text);
            } else if (segment.type === 'tool_execution') {
              accumulator.addToolExecution(segment);
            } else if (segment.type === 'approval_request') {
              const { data, status } = segment;
              accumulator.addApprovalRequest(
                data.requestId || '',
                data.command,
                data.explanation,
                data.approvalType || '',
                status,
              );
            }
          });

          const processedSegments = accumulator.getSegments();
          const updatedMessage = {
            ...currentStreaming,
            content: processedSegments,
          };

          const newStreamingMap = new Map(state.streamingMessages);
          newStreamingMap.set(dialogId, updatedMessage);

          const newMessagesMap = new Map(state.messagesByDialog);
          const currentMessages = newMessagesMap.get(dialogId) || [];
          const existingIndex = currentMessages.findIndex(msg => msg.id === updatedMessage.id);

          if (existingIndex !== -1) {
            const updatedMessages = [...currentMessages];
            updatedMessages[existingIndex] = updatedMessage;
            newMessagesMap.set(dialogId, updatedMessages);
          }

          return {
            streamingMessages: newStreamingMap,
            messagesByDialog: newMessagesMap,
          };
        });
      },

      getOrCreateAccumulator: (
        dialogId: string,
        approvalHandlers?: { onApprove?: (requestId?: string) => void; onReject?: (requestId?: string) => void },
      ) => {
        const state = get();
        const existing = state.segmentAccumulators.get(dialogId);

        if (existing) {
          if (approvalHandlers) {
            existing.setCallbacks(approvalHandlers);
          }
          return existing;
        }

        const accumulator = createMessageSegmentAccumulator(approvalHandlers);

        set(state => {
          const newAccumulatorsMap = new Map(state.segmentAccumulators);
          newAccumulatorsMap.set(dialogId, accumulator);
          return { segmentAccumulators: newAccumulatorsMap };
        });

        return accumulator;
      },

      resetAccumulator: (dialogId: string) => {
        const state = get();
        const accumulator = state.segmentAccumulators.get(dialogId);
        if (accumulator) {
          accumulator.reset();
        }
      },

      updateAccumulatorApprovalStatus: (dialogId: string, requestId: string, status: 'approved' | 'rejected') => {
        const state = get();
        const accumulator = state.segmentAccumulators.get(dialogId);

        if (!accumulator) {
          console.warn('[MingoStore] No accumulator found for approval status update:', dialogId);
          return;
        }

        const updatedSegments = accumulator.updateApprovalStatus(requestId, status);
        const currentStreaming = state.streamingMessages.get(dialogId);
        if (currentStreaming && Array.isArray(currentStreaming.content)) {
          const updatedMessage = {
            ...currentStreaming,
            content: updatedSegments,
          };

          set(state => {
            const newStreamingMap = new Map(state.streamingMessages);
            newStreamingMap.set(dialogId, updatedMessage);

            const newMessagesMap = new Map(state.messagesByDialog);
            const currentMessages = newMessagesMap.get(dialogId) || [];
            const existingIndex = currentMessages.findIndex(msg => msg.id === updatedMessage.id);

            if (existingIndex !== -1) {
              const updatedMessages = [...currentMessages];
              updatedMessages[existingIndex] = updatedMessage;
              newMessagesMap.set(dialogId, updatedMessages);
            }

            return {
              streamingMessages: newStreamingMap,
              messagesByDialog: newMessagesMap,
            };
          });
        }
      },

      removeWelcomeMessages: (dialogId: string) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];
          const filteredMessages = currentMessages.filter(msg => !msg.id.startsWith('welcome-'));
          newMap.set(dialogId, filteredMessages);
          return { messagesByDialog: newMap };
        });
      },

      clearDialog: (dialogId: string) => {
        set(state => {
          const newMessagesMap = new Map(state.messagesByDialog);
          const newTypingMap = new Map(state.typingStates);
          const newUnreadMap = new Map(state.unreadCounts);
          const newStreamingMap = new Map(state.streamingMessages);
          const newAccumulatorsMap = new Map(state.segmentAccumulators);

          newMessagesMap.delete(dialogId);
          newTypingMap.delete(dialogId);
          newUnreadMap.delete(dialogId);
          newStreamingMap.delete(dialogId);
          newAccumulatorsMap.delete(dialogId);

          return {
            messagesByDialog: newMessagesMap,
            typingStates: newTypingMap,
            unreadCounts: newUnreadMap,
            streamingMessages: newStreamingMap,
            segmentAccumulators: newAccumulatorsMap,
          };
        });
      },

      resetAll: () => {
        set({
          messagesByDialog: new Map(),
          activeDialogId: null,
          dialogs: [],
          typingStates: new Map(),
          unreadCounts: new Map(),
          streamingMessages: new Map(),
          segmentAccumulators: new Map(),
          isLoadingDialog: false,
          isLoadingMessages: false,
          isCreatingDialog: false,
          dialogError: null,
          messagesError: null,
          hasMoreMessages: false,
          messagesCursor: null,
          newestMessageCursor: null,
        });
      },

      setLoadingDialog: (loading: boolean) => {
        set({ isLoadingDialog: loading });
      },

      setLoadingMessages: (loading: boolean) => {
        set({ isLoadingMessages: loading });
      },

      setCreatingDialog: (creating: boolean) => {
        set({ isCreatingDialog: creating });
      },

      // Error States
      setDialogError: (error: string | null) => {
        set({ dialogError: error });
      },

      setMessagesError: (error: string | null) => {
        set({ messagesError: error });
      },

      // Pagination
      setPagination: (hasMore: boolean, cursor: string | null, newestCursor: string | null) => {
        set({
          hasMoreMessages: hasMore,
          messagesCursor: cursor,
          newestMessageCursor: newestCursor,
        });
      },
    }),
    {
      name: 'mingo-messages-store',
    },
  ),
);
