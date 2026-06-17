import {
  type ApprovalBatchExecutionState,
  type ApprovalBatchSegment,
  type Message as ChatMessage,
  createMessageSegmentAccumulator,
  type MessageSegment,
  type MessageSegmentAccumulator,
  type TokenUsageData,
  type ToolExecutionSegment,
} from '@flamingo-stack/openframe-frontend-core';
import { create } from 'zustand';

export type ChatSide = 'client' | 'admin';

interface SideState {
  messages: ChatMessage[];
  streaming: ChatMessage | null;
  accumulator: MessageSegmentAccumulator;
  tokenUsage: TokenUsageData | null;
  isTyping: boolean;
  // Highest chunk `streamSeq` this client has consumed for the side (live or replayed). Compared
  // against history's max persisted seq in mergeHistoryWithRealtime to drop replayed synthetics
  // whose turns are already in history.
  highestStreamSeq: number;
}

function createSideState(): SideState {
  return {
    messages: [],
    streaming: null,
    accumulator: createMessageSegmentAccumulator(),
    tokenUsage: null,
    isTyping: false,
    highestStreamSeq: 0,
  };
}

export type ApprovalStatus = 'approved' | 'rejected';
export type ApprovalStatusMap = Record<string, ApprovalStatus>;

interface TicketDetailsStore {
  // Per-side state
  client: SideState;
  admin: SideState;

  approvalStatuses: ApprovalStatusMap;

  // Reset all chat-side state (e.g. on ticket switch)
  clearChatState: () => void;

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
  updateStreamingMessageSegments: (side: ChatSide, segments: MessageSegment[], streamSeq?: number) => void;
  appendSegmentsToLastAssistant: (side: ChatSide, segments: MessageSegment[], streamSeq?: number) => void;

  // Approvals
  updateApprovalStatusInMessages: (
    side: ChatSide,
    requestId: string,
    status: ApprovalStatus,
    resolvedByName?: string | null,
  ) => void;
  updateToolExecutionInMessages: (
    side: ChatSide,
    executionRequestId: string,
    executedData: ToolExecutionSegment['data'],
  ) => void;
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

  // Stream-seq coverage tracking (history/realtime dedupe)
  recordHighestStreamSeq: (side: ChatSide, seq: number) => void;
  getHighestStreamSeq: (side: ChatSide) => number;

  // Reset one side (e.g. on dialog switch)
  clearSide: (side: ChatSide) => void;
}

function produceSide(
  state: TicketDetailsStore,
  side: ChatSide,
  updater: (s: SideState) => SideState,
): Pick<TicketDetailsStore, 'client' | 'admin'> {
  const next = updater(state[side]);
  return side === 'client' ? { client: next, admin: state.admin } : { client: state.client, admin: next };
}

export const useTicketDetailsStore = create<TicketDetailsStore>((set, get) => ({
  client: createSideState(),
  admin: createSideState(),
  approvalStatuses: {},

  clearChatState: () =>
    set({
      client: createSideState(),
      admin: createSideState(),
      approvalStatuses: {},
    }),

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

  updateStreamingMessageSegments: (side, segments, streamSeq) =>
    set(state =>
      produceSide(state, side, s => {
        if (!s.streaming) return s;
        const processed = s.accumulator.replaySegments(segments);
        const updatedMessage: ChatMessage = {
          ...s.streaming,
          content: processed,
          streamSeq: streamSeq != null ? Math.max(s.streaming.streamSeq ?? 0, streamSeq) : s.streaming.streamSeq,
        };
        const idx = s.messages.findIndex(m => m.id === updatedMessage.id);
        const nextMessages = idx !== -1 ? s.messages.map((m, i) => (i === idx ? updatedMessage : m)) : s.messages;
        return { ...s, streaming: updatedMessage, messages: nextMessages };
      }),
    ),

  appendSegmentsToLastAssistant: (side, segments, streamSeq) => {
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
          updated[i] = {
            ...updated[i],
            content: nextContent,
            streamSeq: streamSeq != null ? Math.max(updated[i].streamSeq ?? 0, streamSeq) : updated[i].streamSeq,
          };
          return { ...s, messages: updated };
        }
        return s;
      }),
    );
  },

  updateApprovalStatusInMessages: (side, requestId, status, resolvedByName) =>
    set(state => {
      let matched = false;
      const nextSides = produceSide(state, side, s => {
        const updatedMessages = s.messages.map(message => {
          if (message.role !== 'assistant' || !Array.isArray(message.content)) return message;
          let changed = false;
          const updatedContent = message.content.map(segment => {
            if (segment.type === 'approval_request' && segment.data?.requestId === requestId) {
              matched = true;
              changed = true;
              return { ...segment, status };
            }
            if (segment.type === 'approval_batch' && segment.data?.approvalRequestId === requestId) {
              matched = true;
              changed = true;
              return {
                ...segment,
                status,
                resolvedByName: resolvedByName ?? segment.resolvedByName,
              } as ApprovalBatchSegment;
            }
            return segment;
          });
          return changed ? { ...message, content: updatedContent } : message;
        });

        const updatedSegments = s.accumulator.updateApprovalStatus(requestId, status, resolvedByName);
        const updatedStreaming =
          s.streaming && Array.isArray(s.streaming.content)
            ? { ...s.streaming, content: updatedSegments }
            : s.streaming;

        return { ...s, messages: updatedMessages, streaming: updatedStreaming };
      });
      const approvalStatusChanged = state.approvalStatuses[requestId] !== status;
      if (!matched && !approvalStatusChanged) return state;
      return {
        ...nextSides,
        approvalStatuses: approvalStatusChanged
          ? { ...state.approvalStatuses, [requestId]: status }
          : state.approvalStatuses,
      };
    }),

  updateToolExecutionInMessages: (side, executionRequestId, executedData) =>
    set(state => {
      let matched = false;
      const nextSides = produceSide(state, side, s => {
        const updatedMessages = s.messages.map(message => {
          if (matched) return message;
          if (message.role !== 'assistant' || !Array.isArray(message.content)) return message;

          let changed = false;
          const updatedContent = message.content.map(segment => {
            if (matched) return segment;

            if (
              segment.type === 'tool_execution' &&
              segment.data.type === 'EXECUTING_TOOL' &&
              segment.data.toolExecutionRequestId === executionRequestId
            ) {
              matched = true;
              changed = true;
              const merged: ToolExecutionSegment = {
                type: 'tool_execution',
                data: {
                  ...executedData,
                  toolTitle: executedData.toolTitle ?? segment.data.toolTitle,
                  parameters: executedData.parameters ?? segment.data.parameters,
                },
              };
              return merged;
            }

            if (
              segment.type === 'approval_batch' &&
              segment.data.toolCalls.some(c => c.toolExecutionRequestId === executionRequestId)
            ) {
              matched = true;
              changed = true;
              const prev: ApprovalBatchExecutionState | undefined = segment.data.executions?.[executionRequestId];
              const next: ApprovalBatchExecutionState =
                executedData.type === 'EXECUTED_TOOL'
                  ? { status: 'done', result: executedData.result, success: executedData.success }
                  : { status: 'executing', result: prev?.result, success: prev?.success };
              return {
                ...segment,
                data: {
                  ...segment.data,
                  executions: { ...(segment.data.executions ?? {}), [executionRequestId]: next },
                },
              } as ApprovalBatchSegment;
            }

            return segment;
          });

          return changed ? { ...message, content: updatedContent } : message;
        });

        if (!matched) return s;

        const updatedStreaming = s.streaming
          ? (updatedMessages.find(m => m.id === s.streaming?.id) ?? s.streaming)
          : s.streaming;
        return {
          ...s,
          messages: updatedMessages,
          streaming: updatedStreaming,
        };
      });
      // Outer short-circuit: produceSide always builds a new {client, admin}
      // wrapper even when its updater returned `s` unchanged, so without
      // this guard zustand notifies every subscriber on every no-match.
      if (!matched) return state;
      return nextSides;
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

  recordHighestStreamSeq: (side, seq) =>
    set(state =>
      seq <= state[side].highestStreamSeq ? state : produceSide(state, side, s => ({ ...s, highestStreamSeq: seq })),
    ),

  getHighestStreamSeq: side => get()[side].highestStreamSeq,

  clearSide: side => set(state => produceSide(state, side, _s => createSideState())),
}));
