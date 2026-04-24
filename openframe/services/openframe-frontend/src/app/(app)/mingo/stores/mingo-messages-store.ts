import type { MessageSegment, TokenUsageData } from '@flamingo-stack/openframe-frontend-core';
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
  compactingStates: Map<string, boolean>;
  unreadCounts: Map<string, number>;
  streamingMessages: Map<string, Message | null>;
  segmentAccumulators: Map<string, MessageSegmentAccumulator>;
  tokenUsageByDialog: Map<string, TokenUsageData>;

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
  prependMessages: (dialogId: string, messages: Message[]) => void;
  prependWithBoundaryMerge: (
    dialogId: string,
    newMessages: Message[],
    boundaryMessageId?: string,
    boundaryUpdates?: Partial<Message>,
  ) => void;
  addMessage: (dialogId: string, message: Message) => void;
  updateMessage: (dialogId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (dialogId: string, messageId: string) => void;
  updateApprovalStatusInMessages: (dialogId: string, requestId: string, status: 'approved' | 'rejected') => void;
  getMessages: (dialogId: string) => Message[];

  // Real-time State Management
  setTyping: (dialogId: string, typing: boolean) => void;
  getTyping: (dialogId: string) => boolean;
  setCompacting: (dialogId: string, compacting: boolean) => void;
  getCompacting: (dialogId: string) => boolean;
  incrementUnread: (dialogId: string) => void;
  resetUnread: (dialogId: string) => void;
  getUnread: (dialogId: string) => number;

  // Streaming Messages
  setStreamingMessage: (dialogId: string, message: Message | null) => void;
  getStreamingMessage: (dialogId: string) => Message | null;
  updateStreamingMessageSegments: (dialogId: string, segments: MessageSegment[]) => void;

  appendSegmentsToLastAssistant: (dialogId: string, segments: MessageSegment[]) => void;

  // Segment Accumulators
  getOrCreateAccumulator: (
    dialogId: string,
    approvalHandlers?: { onApprove?: (requestId?: string) => void; onReject?: (requestId?: string) => void },
  ) => MessageSegmentAccumulator;
  resetAccumulator: (dialogId: string) => void;
  updateAccumulatorApprovalStatus: (dialogId: string, requestId: string, status: 'approved' | 'rejected') => void;

  // Token Usage
  setTokenUsage: (dialogId: string, data: TokenUsageData) => void;
  getTokenUsage: (dialogId: string) => TokenUsageData | null;

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
      compactingStates: new Map(),
      unreadCounts: new Map(),
      streamingMessages: new Map(),
      segmentAccumulators: new Map(),
      tokenUsageByDialog: new Map(),

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

      prependMessages: (dialogId: string, messages: Message[]) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];
          newMap.set(dialogId, [...messages, ...currentMessages]);
          return { messagesByDialog: newMap };
        });
      },

      prependWithBoundaryMerge: (dialogId, newMessages, boundaryMessageId?, boundaryUpdates?) => {
        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = [...(newMap.get(dialogId) || [])];

          if (boundaryMessageId && boundaryUpdates) {
            const idx = currentMessages.findIndex(m => m.id === boundaryMessageId);
            if (idx !== -1) {
              currentMessages[idx] = { ...currentMessages[idx], ...boundaryUpdates };
            }
          }

          if (newMessages.length > 0) {
            newMap.set(dialogId, [...newMessages, ...currentMessages]);
          } else {
            newMap.set(dialogId, currentMessages);
          }

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

      setCompacting: (dialogId: string, compacting: boolean) => {
        set(state => {
          const newMap = new Map(state.compactingStates);
          newMap.set(dialogId, compacting);
          return { compactingStates: newMap };
        });
      },

      getCompacting: (dialogId: string) => {
        const state = get();
        return state.compactingStates.get(dialogId) || false;
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

          const processedSegments = accumulator.replaySegments(segments);
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

      appendSegmentsToLastAssistant: (dialogId: string, segments: MessageSegment[]) => {
        const incomingCompaction = [...segments]
          .reverse()
          .find((s): s is Extract<MessageSegment, { type: 'context_compaction' }> => s.type === 'context_compaction');

        set(state => {
          const newMap = new Map(state.messagesByDialog);
          const currentMessages = newMap.get(dialogId) || [];

          for (let i = currentMessages.length - 1; i >= 0; i--) {
            if (currentMessages[i].role === 'assistant') {
              const updatedMessages = [...currentMessages];
              const existing = Array.isArray(updatedMessages[i].content)
                ? (updatedMessages[i].content as MessageSegment[])
                : [];

              let nextContent: MessageSegment[];

              if (incomingCompaction) {
                const startedIdx = existing.findIndex(s => s.type === 'context_compaction' && s.status === 'started');
                const hasAnyCompaction = existing.some(s => s.type === 'context_compaction');

                if (incomingCompaction.status === 'completed' && startedIdx !== -1) {
                  nextContent = [...existing];
                  nextContent[startedIdx] = incomingCompaction;
                } else if (!hasAnyCompaction) {
                  nextContent = [...existing, incomingCompaction];
                } else {
                  nextContent = existing;
                }
              } else {
                const accumulator = state.segmentAccumulators.get(dialogId);
                nextContent = accumulator
                  ? accumulator.replaySegments([...existing, ...segments])
                  : [...existing, ...segments];
              }

              updatedMessages[i] = { ...updatedMessages[i], content: nextContent };
              newMap.set(dialogId, updatedMessages);
              return { messagesByDialog: newMap };
            }
          }

          return state;
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

      setTokenUsage: (dialogId: string, data: TokenUsageData) => {
        set(state => {
          const newMap = new Map(state.tokenUsageByDialog);
          newMap.set(dialogId, data);
          return { tokenUsageByDialog: newMap };
        });
      },

      getTokenUsage: (dialogId: string) => {
        return get().tokenUsageByDialog.get(dialogId) || null;
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
          const newCompactingMap = new Map(state.compactingStates);
          const newUnreadMap = new Map(state.unreadCounts);
          const newStreamingMap = new Map(state.streamingMessages);
          const newAccumulatorsMap = new Map(state.segmentAccumulators);
          const newTokenUsageMap = new Map(state.tokenUsageByDialog);

          newMessagesMap.delete(dialogId);
          newTypingMap.delete(dialogId);
          newCompactingMap.delete(dialogId);
          newUnreadMap.delete(dialogId);
          newStreamingMap.delete(dialogId);
          newAccumulatorsMap.delete(dialogId);
          newTokenUsageMap.delete(dialogId);

          return {
            messagesByDialog: newMessagesMap,
            typingStates: newTypingMap,
            compactingStates: newCompactingMap,
            unreadCounts: newUnreadMap,
            streamingMessages: newStreamingMap,
            segmentAccumulators: newAccumulatorsMap,
            tokenUsageByDialog: newTokenUsageMap,
          };
        });
      },

      resetAll: () => {
        set({
          messagesByDialog: new Map(),
          activeDialogId: null,
          dialogs: [],
          typingStates: new Map(),
          compactingStates: new Map(),
          unreadCounts: new Map(),
          streamingMessages: new Map(),
          segmentAccumulators: new Map(),
          tokenUsageByDialog: new Map(),
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
