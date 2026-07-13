'use client';

import {
  type ChatApprovalStatus,
  type ChunkData,
  extractIncompleteMessageState,
  type MessageSegment,
  type NatsMessageType,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  type ToolExecutionSegment,
  useJetStreamDialogSubscription,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerActiveDialogView } from '@/lib/active-dialog-views';
import { featureFlags } from '@/lib/feature-flags';
import { useNatsAppConfig } from '@/lib/nats/nats-app-config';
import { useAuthStore } from '@/stores';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { DialogNode } from '../types/dialog.types';
import type { CoreMessage } from '../types/message.types';

const MINGO_JETSTREAM_TOPIC: NatsMessageType = 'admin-message';
const CHAT_CHUNKS_STREAM = 'CHAT_CHUNKS';

function isInProgress(segments: MessageSegment[]): boolean {
  return segments.some(seg => {
    if (seg.type === 'tool_execution' && seg.data.type === 'EXECUTING_TOOL') return true;
    if (seg.type === 'approval_request') return true;
    if (seg.type === 'approval_batch') {
      // Treat batch as in-progress unless it was rejected OR every tool call
      // has a `done` execution.
      const allDone =
        !!seg.data.executions &&
        seg.data.toolCalls.every(c => seg.data.executions?.[c.toolExecutionRequestId]?.status === 'done');
      return seg.status !== 'rejected' && !allDone;
    }
    return false;
  });
}

interface UseMingoRealtimeSubscriptionOptions {
  onChunkReceived?: (dialogId: string, chunk: ChunkData, messageType: NatsMessageType) => void;
}

interface DialogSubscriptionState {
  isSubscribed: boolean;
  isConnected: boolean;
  hasCaughtUp: boolean;
}

interface UseMingoRealtimeSubscription {
  subscribeToDialog: (dialogId: string) => void;
  unsubscribeFromDialog: (dialogId: string) => void;
  getSubscriptionState: (dialogId: string) => DialogSubscriptionState;
  subscribedDialogs: Set<string>;
  connectionState: 'connected' | 'disconnected' | 'connecting';
  onConnectionChange: (dialogId: string, connected: boolean) => void;
}

export function useMingoRealtimeSubscription(
  activeDialogId: string | null,
  options: UseMingoRealtimeSubscriptionOptions = {},
): UseMingoRealtimeSubscription {
  const { onChunkReceived } = options;

  const [subscribedDialogs, setSubscribedDialogs] = useState<Set<string>>(new Set());
  const [dialogStates, setDialogStates] = useState<Map<string, DialogSubscriptionState>>(new Map());
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const onChunkReceivedRef = useRef(onChunkReceived);
  const catchupRefs = useRef<Map<string, any>>(new Map());

  const { resetUnread } = useMingoMessagesStore();

  useEffect(() => {
    onChunkReceivedRef.current = onChunkReceived;
  }, [onChunkReceived]);

  const onConnectionChange = useCallback((dialogId: string, connected: boolean) => {
    setConnectionState(connected ? 'connected' : 'disconnected');
    setDialogStates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(dialogId);
      if (existing) {
        newMap.set(dialogId, { ...existing, isConnected: connected });
      }
      return newMap;
    });
  }, []);

  const getSubscriptionState = useCallback(
    (dialogId: string): DialogSubscriptionState => {
      return (
        dialogStates.get(dialogId) || {
          isSubscribed: false,
          isConnected: false,
          hasCaughtUp: false,
        }
      );
    },
    [dialogStates],
  );

  const subscribeToDialog = useCallback(
    (dialogId: string) => {
      if (subscribedDialogs.has(dialogId)) return;

      setSubscribedDialogs(prev => new Set(prev).add(dialogId));
      setDialogStates(prev => {
        const newMap = new Map(prev);
        newMap.set(dialogId, {
          isSubscribed: true,
          isConnected: false,
          hasCaughtUp: false,
        });
        return newMap;
      });

      if (dialogId === activeDialogId) {
        resetUnread(dialogId);
      }
    },
    [subscribedDialogs, activeDialogId, resetUnread],
  );

  const unsubscribeFromDialog = useCallback((dialogId: string) => {
    setSubscribedDialogs(prev => {
      const newSet = new Set(prev);
      newSet.delete(dialogId);
      return newSet;
    });

    setDialogStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(dialogId);
      return newMap;
    });

    catchupRefs.current.delete(dialogId);
  }, []);

  useEffect(() => {
    if (activeDialogId && !subscribedDialogs.has(activeDialogId)) {
      subscribeToDialog(activeDialogId);
    }
  }, [activeDialogId, subscribedDialogs, subscribeToDialog]);

  return {
    subscribeToDialog,
    unsubscribeFromDialog,
    getSubscriptionState,
    subscribedDialogs,
    connectionState,
    onConnectionChange,
  };
}

interface UseDialogChunkProcessorOptions {
  onApprove?: (requestId?: string) => void | Promise<void>;
  onReject?: (requestId?: string) => void | Promise<void>;
  approvalStatuses?: Record<string, any>;
  onMetadata?: (metadata: {
    modelDisplayName: string;
    modelName: string;
    providerName: string;
    contextWindow: number;
  }) => void;
}

function useDialogChunkProcessor(dialogId: string, options: UseDialogChunkProcessorOptions = {}) {
  const { onApprove, onReject, approvalStatuses, onMetadata } = options;
  const {
    messagesByDialog,
    streamingMessages,
    getMessages,
    addMessage,
    updateMessage,
    setTyping,
    setStreamingMessage,
    getStreamingMessage,
    updateStreamingMessageSegments,
    appendSegmentsToLastAssistant,
    updateApprovalStatusInMessages,
    updateToolExecutionInMessages,
    getOrCreateAccumulator,
    setTokenUsage,
  } = useMingoMessagesStore();

  const currentUserId = useAuthStore(state => state.user?.id);

  useEffect(() => {
    if (onApprove || onReject) {
      getOrCreateAccumulator(dialogId, { onApprove, onReject });
    }
  }, [dialogId, onApprove, onReject, getOrCreateAccumulator]);

  const ensureAssistantMessage = useCallback(() => {
    const currentStreaming = getStreamingMessage(dialogId);
    if (currentStreaming) return;

    const current = getMessages(dialogId);
    const last = current[current.length - 1];
    if (last?.role === 'assistant' && Array.isArray(last.content) && isInProgress(last.content)) {
      setStreamingMessage(dialogId, last);
      return;
    }

    const assistantMessage: CoreMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: 'assistant',
      content: [],
      name: 'Mingo',
      assistantType: 'mingo',
      timestamp: new Date(),
    };

    setStreamingMessage(dialogId, assistantMessage);
    addMessage(dialogId, assistantMessage);
  }, [dialogId, getMessages, getStreamingMessage, setStreamingMessage, addMessage]);

  const addErrorMessage = useCallback(
    (errorText: string) => {
      const errorMessage: CoreMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        name: 'Mingo',
        timestamp: new Date(),
        content: errorText,
      };

      const currentMessages = getMessages(dialogId);
      const lastMessage = currentMessages[currentMessages.length - 1];

      if (
        lastMessage?.role === 'assistant' &&
        (lastMessage.content === '' || (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))
      ) {
        updateMessage(dialogId, lastMessage.id, errorMessage);
      } else {
        addMessage(dialogId, errorMessage);
      }
    },
    [dialogId, getMessages, updateMessage, addMessage],
  );

  const incompleteState = useMemo(() => {
    const currentMessages = messagesByDialog.get(dialogId) || [];
    const assistantSegments: MessageSegment[] = [];
    let lastAssistantId = '';
    let lastAssistantTimestamp = new Date();

    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i];
      if (msg.role === 'assistant') {
        if (!lastAssistantId) {
          lastAssistantId = msg.id;
          lastAssistantTimestamp = msg.timestamp || new Date();
        }

        if (Array.isArray(msg.content)) {
          assistantSegments.unshift(...msg.content);
        } else if (typeof msg.content === 'string' && msg.content) {
          assistantSegments.unshift({
            type: 'text',
            text: msg.content,
            id: `${msg.id}-text`,
          } as MessageSegment);
        }
      } else {
        break;
      }
    }

    if (assistantSegments.length > 0 && lastAssistantId) {
      const completeAssistantMessage = {
        id: lastAssistantId,
        role: 'assistant' as const,
        content: assistantSegments,
        name: 'Mingo',
        timestamp: lastAssistantTimestamp,
      };

      const libState = extractIncompleteMessageState(completeAssistantMessage);
      if (libState) return libState;

      if (streamingMessages.get(dialogId)) {
        return { existingSegments: assistantSegments };
      }
    }

    return undefined;
  }, [dialogId, messagesByDialog, streamingMessages]);

  const realtimeCallbacks = useMemo(
    () => ({
      onStreamStart: () => {
        ensureAssistantMessage();
        setTyping(dialogId, true);
      },

      onStreamEnd: () => {
        setTyping(dialogId, false);
        setStreamingMessage(dialogId, null);
      },

      onSegmentsUpdate: (segments: MessageSegment[], metadata?: SegmentsUpdateMetadata) => {
        // Compaction emits (start AND end carry isCompacting) must not FORCE
        // typing off: during the window the 'started' tail segment masks it
        // via isCompacting, but the end-emit used to drop both flags at once,
        // unlocking the composer until the continuation's first chunk. Leave
        // typing as-is on compaction emits; set it on everything else.
        if (!metadata?.isCompacting) setTyping(dialogId, true);
        if (metadata?.append) {
          appendSegmentsToLastAssistant(dialogId, segments, metadata?.streamSeq);
        } else {
          ensureAssistantMessage();
          updateStreamingMessageSegments(dialogId, segments, metadata?.streamSeq);
        }
      },

      onError: (error: string) => {
        console.error('[DialogSubscription] Stream error:', error);
        setTyping(dialogId, false);
        setStreamingMessage(dialogId, null);
        addErrorMessage(error);
      },

      // EXECUTING_TOOL / approved APPROVAL_RESULT chunks land OUTSIDE the
      // message_start/end window (approved commands run between the approval
      // bubble and the continuation stream), so onSegmentsUpdate never fires
      // for them — without this the composer unlocks while commands execute.
      // Also covers approvals resolved by another admin. Cleared by the
      // continuation's onStreamEnd / onError / Stop.
      onAgentBusy: () => {
        setTyping(dialogId, true);
      },

      onTokenUsage: (data: TokenUsageData) => {
        setTokenUsage(dialogId, data);
      },

      onApprovalResolved: (
        requestId: string,
        status: ChatApprovalStatus,
        _approvalType: string,
        resolvedByName?: string | null,
      ) => {
        if (status === 'approved' || status === 'rejected') {
          updateApprovalStatusInMessages(dialogId, requestId, status, resolvedByName);
        }
      },

      onToolExecuted: (segment: ToolExecutionSegment) => {
        const execId = segment.data.toolExecutionRequestId;
        if (execId) updateToolExecutionInMessages(dialogId, execId, segment.data);
      },

      onUserMessage: (
        text: string,
        meta?: {
          ownerType?: string;
          displayName?: string;
          userId?: string;
          streamSeq?: number;
          contextItems?: Array<{ type: string; id: string }>;
        },
      ) => {
        if (meta?.userId && meta.userId === currentUserId) return;
        // The `MESSAGE_REQUEST` chunk carries only `{ type, id }` — no label.
        // Fall back to the id as the chip text; the lib resolves the icon by
        // `type` from `contextPicker.entityTypes`.
        const contextItems = meta?.contextItems?.length
          ? meta.contextItems.map(i => ({ type: i.type, id: i.id, label: i.id }))
          : undefined;
        addMessage(dialogId, {
          id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          authorType: meta?.ownerType === 'ADMIN' ? 'admin' : 'user',
          content: text,
          name: meta?.displayName || (meta?.ownerType === 'ADMIN' ? 'Admin' : 'You'),
          avatar: null,
          timestamp: new Date(),
          streamSeq: meta?.streamSeq,
          contextItems,
        });
      },

      onMetadata,
      onApprove,
      onReject,
    }),
    [
      dialogId,
      ensureAssistantMessage,
      appendSegmentsToLastAssistant,
      setTyping,
      setStreamingMessage,
      updateStreamingMessageSegments,
      updateApprovalStatusInMessages,
      updateToolExecutionInMessages,
      addErrorMessage,
      addMessage,
      currentUserId,
      setTokenUsage,
      onMetadata,
      onApprove,
      onReject,
    ],
  );

  const { processChunk: processorProcessChunk } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    approvalStatuses: approvalStatuses || {},
    initialState: incompleteState,
    batchApprovalsEnabled: featureFlags.batchApproval.enabled(),
  });

  return { processChunk: processorProcessChunk };
}

interface DialogSubscriptionProps {
  dialogId: string;
  isActive: boolean;
  onApprove?: (requestId?: string) => void;
  onReject?: (requestId?: string) => void;
  approvalStatuses?: Record<string, any>;
  onConnectionChange?: (dialogId: string, connected: boolean) => void;
  onMetadata?: (metadata: {
    modelDisplayName: string;
    modelName: string;
    providerName: string;
    contextWindow: number;
  }) => void;
  initialOptStartSeq: number | null;
  isInitialOptStartSeqReady: boolean;
}

export function DialogSubscription({
  dialogId,
  onApprove,
  onReject,
  approvalStatuses,
  onConnectionChange,
  onMetadata,
  initialOptStartSeq,
  isInitialOptStartSeqReady,
}: DialogSubscriptionProps) {
  const { getWsUrl, onBeforeReconnect } = useNatsAppConfig();

  // While this live tail is mounted the user is watching the dialog, so the
  // notifications pipeline suppresses popups / auto-reads for it.
  useEffect(() => registerActiveDialogView(dialogId), [dialogId]);

  const recordHighestStreamSeq = useMingoMessagesStore(s => s.recordHighestStreamSeq);
  const storedHighestSeq = useMingoMessagesStore(s => s.highestStreamSeqByDialog.get(dialogId) ?? 0);
  const effectiveOptStartSeq = Math.max(initialOptStartSeq ?? 0, storedHighestSeq);

  const { processChunk: processorProcessChunk } = useDialogChunkProcessor(dialogId, {
    onApprove,
    onReject,
    approvalStatuses,
    onMetadata,
  });

  const processorRef = useRef(processorProcessChunk);
  useEffect(() => {
    processorRef.current = processorProcessChunk;
  }, [processorProcessChunk]);

  const queryClient = useQueryClient();

  // Rejects out-of-order JetStream redeliveries.
  const lastAppliedStreamSeqRef = useRef<number>(-1);

  const syncStreamStateFromChunk = useCallback(
    (chunk: ChunkData) => {
      if (typeof chunk.streamSeq === 'number') {
        recordHighestStreamSeq(dialogId, chunk.streamSeq);
      }
      const next = chunk.streamState;
      if (!next) return;
      if (typeof chunk.streamSeq === 'number') {
        if (chunk.streamSeq < lastAppliedStreamSeqRef.current) return;
        lastAppliedStreamSeqRef.current = chunk.streamSeq;
      }
      queryClient.setQueryData<DialogNode | null | undefined>(['mingo-dialog', dialogId], prev =>
        prev ? { ...prev, streamState: next } : prev,
      );
    },
    [queryClient, dialogId, recordHighestStreamSeq],
  );

  const handleJetStreamEvent = useCallback(
    (payload: unknown, _messageType: NatsMessageType) => {
      const chunk = payload as ChunkData;
      if (featureFlags.debugNatsChunks.enabled()) {
        console.log('[mingo-js] chunk received', { dialogId, streamSeq: chunk.streamSeq, chunk });
      }
      syncStreamStateFromChunk(chunk);
      processorRef.current(chunk);
    },
    [syncStreamStateFromChunk, dialogId],
  );

  const handleConnect = useCallback(() => {
    onConnectionChange?.(dialogId, true);
  }, [dialogId, onConnectionChange]);

  const handleDisconnect = useCallback(() => {
    onConnectionChange?.(dialogId, false);
  }, [dialogId, onConnectionChange]);

  useJetStreamDialogSubscription({
    enabled: isInitialOptStartSeqReady,
    dialogId,
    streamName: CHAT_CHUNKS_STREAM,
    topic: MINGO_JETSTREAM_TOPIC,
    optStartSeq: effectiveOptStartSeq,
    onEvent: handleJetStreamEvent,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
  });

  return null;
}
