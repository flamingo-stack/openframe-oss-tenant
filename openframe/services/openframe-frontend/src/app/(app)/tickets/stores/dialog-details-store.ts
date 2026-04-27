import {
  type Message as ChatMessage,
  createMessageSegmentAccumulator,
  type MessageSegment,
  type MessageSegmentAccumulator,
  type TokenUsageData,
} from '@flamingo-stack/openframe-frontend-core';
import { create } from 'zustand';
import { getDialogService } from '../services';
import type { Dialog } from '../types/dialog.types';

export type ChatSide = 'client' | 'admin';

interface SideState {
  messages: ChatMessage[];
  streaming: ChatMessage | null;
  accumulator: MessageSegmentAccumulator;
  tokenUsage: TokenUsageData | null;
  isTyping: boolean;
}

function createSideState(): SideState {
  return {
    messages: [],
    streaming: null,
    accumulator: createMessageSegmentAccumulator(),
    tokenUsage: null,
    isTyping: false,
  };
}

export type ApprovalStatus = 'approved' | 'rejected';
export type ApprovalStatusMap = Record<string, ApprovalStatus>;

interface DialogDetailsStore {
  // Dialog
  currentDialogId: string | null;
  currentDialog: Dialog | null;
  isLoadingDialog: boolean;
  loadingDialogId: string | null;
  dialogError: string | null;

  // Per-side state
  client: SideState;
  admin: SideState;

  approvalStatuses: ApprovalStatusMap;

  // Dialog actions
  fetchDialog: (dialogId: string, version?: 'v1' | 'v2') => Promise<Dialog | null>;
  clearCurrent: () => void;
  updateDialogStatus: (status: string) => void;
  updateDialogMode: (mode: string, dialogId?: string) => void;

  // Per-side message actions
  setMessages: (side: ChatSide, messages: ChatMessage[]) => void;
  prependMessages: (side: ChatSide, messages: ChatMessage[]) => void;
  prependWithBoundaryMerge: (
    side: ChatSide,
    newMessages: ChatMessage[],
    boundaryMessageId?: string,
    boundaryUpdates?: Partial<ChatMessage>,
  ) => void;
  addMessage: (side: ChatSide, message: ChatMessage) => void;
  updateMessage: (side: ChatSide, messageId: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (side: ChatSide, messageId: string) => void;
  getMessages: (side: ChatSide) => ChatMessage[];

  // Streaming
  setStreamingMessage: (side: ChatSide, message: ChatMessage | null) => void;
  getStreamingMessage: (side: ChatSide) => ChatMessage | null;
  updateStreamingMessageSegments: (side: ChatSide, segments: MessageSegment[]) => void;
  appendSegmentsToLastAssistant: (side: ChatSide, segments: MessageSegment[]) => void;
  dropIncompleteAssistantTail: (side: ChatSide) => void;

  // Approvals
  updateApprovalStatusInMessages: (side: ChatSide, requestId: string, status: ApprovalStatus) => void;
  setApprovalStatus: (requestId: string, status: ApprovalStatus) => void;
  mergeApprovalStatuses: (entries: ApprovalStatusMap) => void;

  // Accumulator
  setAccumulatorCallbacks: (
    side: ChatSide,
    callbacks: {
      onApprove?: (requestId?: string) => void | Promise<void>;
      onReject?: (requestId?: string) => void | Promise<void>;
    },
  ) => void;
  resetAccumulator: (side: ChatSide) => void;

  // Token usage
  setTokenUsage: (side: ChatSide, data: TokenUsageData | null) => void;
  getTokenUsage: (side: ChatSide) => TokenUsageData | null;

  // Typing
  setTypingIndicator: (side: ChatSide, typing: boolean) => void;

  // Reset one side (e.g. on dialog switch)
  clearSide: (side: ChatSide) => void;
}

function produceSide(
  state: DialogDetailsStore,
  side: ChatSide,
  updater: (s: SideState) => SideState,
): Pick<DialogDetailsStore, 'client' | 'admin'> {
  const next = updater(state[side]);
  return side === 'client' ? { client: next, admin: state.admin } : { client: state.client, admin: next };
}

export const useDialogDetailsStore = create<DialogDetailsStore>((set, get) => ({
  currentDialogId: null,
  currentDialog: null,
  isLoadingDialog: false,
  loadingDialogId: null,
  dialogError: null,

  client: createSideState(),
  admin: createSideState(),
  approvalStatuses: {},

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
      dialogError: null,
      loadingDialogId: null,
      client: createSideState(),
      admin: createSideState(),
      approvalStatuses: {},
    }),

  updateDialogStatus: (status: string) => {
    const state = get();
    if (state.currentDialog) {
      set({
        currentDialog: {
          ...state.currentDialog,
          status: status as Dialog['status'],
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

  setMessages: (side, messages) => set(state => produceSide(state, side, s => ({ ...s, messages }))),

  prependMessages: (side, messages) =>
    set(state =>
      produceSide(state, side, s => ({
        ...s,
        messages: [...messages, ...s.messages],
      })),
    ),

  prependWithBoundaryMerge: (side, newMessages, boundaryMessageId, boundaryUpdates) =>
    set(state =>
      produceSide(state, side, s => {
        let current = s.messages;
        if (boundaryMessageId && boundaryUpdates) {
          const idx = current.findIndex(m => m.id === boundaryMessageId);
          if (idx !== -1) {
            current = [...current];
            current[idx] = { ...current[idx], ...boundaryUpdates };
          }
        }
        const next = newMessages.length > 0 ? [...newMessages, ...current] : current;
        return { ...s, messages: next };
      }),
    ),

  addMessage: (side, message) =>
    set(state =>
      produceSide(state, side, s => {
        const existingIndex = s.messages.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          const updated = [...s.messages];
          updated[existingIndex] = message;
          return { ...s, messages: updated };
        }
        return { ...s, messages: [...s.messages, message] };
      }),
    ),

  updateMessage: (side, messageId, updates) =>
    set(state =>
      produceSide(state, side, s => {
        const idx = s.messages.findIndex(m => m.id === messageId);
        if (idx === -1) return s;
        const updated = [...s.messages];
        updated[idx] = { ...updated[idx], ...updates };
        return { ...s, messages: updated };
      }),
    ),

  removeMessage: (side, messageId) =>
    set(state =>
      produceSide(state, side, s => ({
        ...s,
        messages: s.messages.filter(m => m.id !== messageId),
      })),
    ),

  getMessages: side => get()[side].messages,

  setStreamingMessage: (side, message) => set(state => produceSide(state, side, s => ({ ...s, streaming: message }))),

  getStreamingMessage: side => get()[side].streaming,

  updateStreamingMessageSegments: (side, segments) =>
    set(state =>
      produceSide(state, side, s => {
        if (!s.streaming) return s;
        const processed = s.accumulator.replaySegments(segments);
        const updatedMessage: ChatMessage = { ...s.streaming, content: processed };
        const idx = s.messages.findIndex(m => m.id === updatedMessage.id);
        const nextMessages = idx !== -1 ? s.messages.map((m, i) => (i === idx ? updatedMessage : m)) : s.messages;
        return { ...s, streaming: updatedMessage, messages: nextMessages };
      }),
    ),

  dropIncompleteAssistantTail: side =>
    set(state =>
      produceSide(state, side, s => {
        let dropFromIndex = s.messages.length;
        for (let i = s.messages.length - 1; i >= 0; i--) {
          const msg = s.messages[i];
          if (msg.role !== 'assistant') break;
          const isSynthetic = typeof msg.id === 'string' && msg.id.startsWith('pending-approvals-');
          const hasExecutingTool =
            Array.isArray(msg.content) &&
            msg.content.some(seg => seg.type === 'tool_execution' && seg.data.type === 'EXECUTING_TOOL');
          if (isSynthetic || hasExecutingTool) {
            dropFromIndex = i;
          } else {
            break;
          }
        }
        if (dropFromIndex === s.messages.length) return s;
        return { ...s, messages: s.messages.slice(0, dropFromIndex) };
      }),
    ),

  appendSegmentsToLastAssistant: (side, segments) => {
    const incomingCompaction = [...segments]
      .reverse()
      .find((seg): seg is Extract<MessageSegment, { type: 'context_compaction' }> => seg.type === 'context_compaction');

    set(state =>
      produceSide(state, side, s => {
        for (let i = s.messages.length - 1; i >= 0; i--) {
          if (s.messages[i].role !== 'assistant') continue;
          const existing = Array.isArray(s.messages[i].content) ? (s.messages[i].content as MessageSegment[]) : [];

          let nextContent: MessageSegment[];
          if (incomingCompaction) {
            const startedIdx = existing.findIndex(seg => seg.type === 'context_compaction' && seg.status === 'started');
            const hasAnyCompaction = existing.some(seg => seg.type === 'context_compaction');
            if (incomingCompaction.status === 'completed' && startedIdx !== -1) {
              nextContent = [...existing];
              nextContent[startedIdx] = incomingCompaction;
            } else if (!hasAnyCompaction) {
              nextContent = [...existing, incomingCompaction];
            } else {
              nextContent = existing;
            }
          } else {
            nextContent = s.accumulator.replaySegments([...existing, ...segments]);
          }

          const updated = [...s.messages];
          updated[i] = { ...updated[i], content: nextContent };
          return { ...s, messages: updated };
        }
        return s;
      }),
    );
  },

  updateApprovalStatusInMessages: (side, requestId, status) =>
    set(state => {
      const nextSides = produceSide(state, side, s => {
        const updatedMessages = s.messages.map(message => {
          if (message.role !== 'assistant' || !Array.isArray(message.content)) return message;
          const updatedContent = message.content.map(segment => {
            if (segment.type === 'approval_request' && segment.data?.requestId === requestId) {
              return { ...segment, status };
            }
            return segment;
          });
          return { ...message, content: updatedContent };
        });

        const updatedSegments = s.accumulator.updateApprovalStatus(requestId, status);
        const updatedStreaming =
          s.streaming && Array.isArray(s.streaming.content)
            ? { ...s.streaming, content: updatedSegments }
            : s.streaming;

        return { ...s, messages: updatedMessages, streaming: updatedStreaming };
      });
      return {
        ...nextSides,
        approvalStatuses:
          state.approvalStatuses[requestId] === status
            ? state.approvalStatuses
            : { ...state.approvalStatuses, [requestId]: status },
      };
    }),

  setApprovalStatus: (requestId, status) =>
    set(state =>
      state.approvalStatuses[requestId] === status
        ? state
        : { approvalStatuses: { ...state.approvalStatuses, [requestId]: status } },
    ),

  mergeApprovalStatuses: entries =>
    set(state => {
      let changed = false;
      const next: ApprovalStatusMap = { ...state.approvalStatuses };
      for (const [id, status] of Object.entries(entries)) {
        if (next[id] !== status) {
          next[id] = status;
          changed = true;
        }
      }
      return changed ? { approvalStatuses: next } : state;
    }),

  setAccumulatorCallbacks: (side, callbacks) => {
    get()[side].accumulator.setCallbacks(callbacks);
  },

  resetAccumulator: side => {
    get()[side].accumulator.reset();
  },

  setTokenUsage: (side, data) => set(state => produceSide(state, side, s => ({ ...s, tokenUsage: data }))),

  getTokenUsage: side => get()[side].tokenUsage,

  setTypingIndicator: (side, typing) => set(state => produceSide(state, side, s => ({ ...s, isTyping: typing }))),

  clearSide: side => set(state => produceSide(state, side, _s => createSideState())),
}));
