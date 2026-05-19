'use client';

import {
  buildNatsWsUrl,
  type ChunkData,
  extractIncompleteMessageState,
  type MessageSegment,
  type NatsMessageType,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  useJetStreamDialogSubscription,
  useNatsDialogSubscription,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { runtimeEnv } from '@/lib/runtime-config';
import { STORAGE_KEYS } from '../../tickets/constants';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { DialogNode } from '../types/dialog.types';
import type { CoreMessage } from '../types/message.types';
import { useMingoChunkCatchup } from './use-mingo-chunk-catchup';

const MINGO_JETSTREAM_TOPIC: NatsMessageType = 'admin-message';
const MINGO_TOPICS: NatsMessageType[] = [MINGO_JETSTREAM_TOPIC];
const CHAT_CHUNKS_STREAM = 'CHAT_CHUNKS';

function isInProgress(segments: MessageSegment[]): boolean {
  return segments.some(seg => {
    if (seg.type === 'tool_execution' && seg.data.type === 'EXECUTING_TOOL') return true;
    if (seg.type === 'approval_request') return true;
    if (seg.type === 'approval_batch') {
      // Treat batch as in-progress unless it was rejected OR every tool call
      // has a `done` execution. While in-progress, post-stream chunks
      // (THINKING/TEXT/tool executions from `continueChain`) should reuse
      // this existing assistant message as streaming rather than spawn a
      // duplicate.
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
  isDevTicketEnabled: boolean;
  onConnectionChange: (dialogId: string, connected: boolean) => void;
}

function getApiBaseUrl(): string | null {
  const envBase = runtimeEnv.tenantHostUrl();
  if (envBase) return envBase;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return null;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null;
  } catch {
    return null;
  }
}

/**
 * Unified realtime subscription hook for Mingo chat
 * Manages NATS subscriptions for multiple dialogs with multi-topic support
 */
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

  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();

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
    isDevTicketEnabled,
    onConnectionChange,
  };
}

// Per-dialog chunk processing hook
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
    getMessages,
    addMessage,
    updateMessage,
    setTyping,
    setStreamingMessage,
    getStreamingMessage,
    updateStreamingMessageSegments,
    appendSegmentsToLastAssistant,
    getOrCreateAccumulator,
    setTokenUsage,
  } = useMingoMessagesStore();

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

      return extractIncompleteMessageState(completeAssistantMessage);
    }

    return undefined;
  }, [dialogId, messagesByDialog]);

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
        setTyping(dialogId, !metadata?.isCompacting);
        if (metadata?.append) {
          appendSegmentsToLastAssistant(dialogId, segments);
        } else {
          ensureAssistantMessage();
          updateStreamingMessageSegments(dialogId, segments);
        }
      },

      onError: (error: string) => {
        console.error('[DialogSubscription] Stream error:', error);
        setTyping(dialogId, false);
        setStreamingMessage(dialogId, null);
        addErrorMessage(error);
      },

      onTokenUsage: (data: TokenUsageData) => {
        setTokenUsage(dialogId, data);
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
      addErrorMessage,
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
    enableThinking: featureFlags.thinking.enabled(),
    batchApprovalsEnabled: featureFlags.batchApproval.enabled(),
  });

  return { processChunk: processorProcessChunk };
}

// Individual dialog subscription component
interface DialogSubscriptionProps {
  dialogId: string;
  isActive: boolean;
  onApprove?: (requestId?: string) => void;
  onReject?: (requestId?: string) => void;
  approvalStatuses?: Record<string, any>;
  isDevTicketEnabled: boolean;
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
  isDevTicketEnabled,
  onConnectionChange,
  onMetadata,
  initialOptStartSeq,
  isInitialOptStartSeqReady,
}: DialogSubscriptionProps) {
  const [apiBaseUrl] = useState<string | null>(getApiBaseUrl);
  const [hasCaughtUp, setHasCaughtUp] = useState(false);
  const [token, setToken] = useState<string | null>(isDevTicketEnabled ? getAccessToken() : null);

  // Resolved once per mount: switching transports mid-stream would require
  // tearing down one subscription and recreating the other with the right
  // offset, which complicates state ownership. Picking up a flag change on
  // the next page load is acceptable for a runtime rollout.
  const [useJetstream] = useState(() => featureFlags.aiStreamingJetstream.enabled());

  useEffect(() => {
    if (!isDevTicketEnabled) return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ACCESS_TOKEN) {
        setToken(getAccessToken());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isDevTicketEnabled]);

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

  const {
    catchUpChunks,
    resetChunkTracking,
    startInitialBuffering,
    processChunk: coreProcessChunk,
    resetAndCatchUp,
  } = useMingoChunkCatchup({
    dialogId,
    onChunkReceived: useCallback((chunk: ChunkData, _messageType: NatsMessageType) => {
      processorRef.current(chunk);
    }, []),
  });

  const queryClient = useQueryClient();

  // NATS WebSocket URL
  const getNatsWsUrl = useMemo(() => {
    return (): string | null => {
      if (!apiBaseUrl) return null;
      if (isDevTicketEnabled && !token) return null;
      return buildNatsWsUrl(apiBaseUrl, {
        token: token || undefined,
        includeAuthParam: isDevTicketEnabled,
        source: 'dashboard',
      });
    };
  }, [apiBaseUrl, token, isDevTicketEnabled]);

  const clientConfig = useMemo(
    () => ({
      name: `openframe-frontend-mingo-${dialogId}`,
      user: 'machine',
      pass: '',
    }),
    [dialogId],
  );

  const reconnectionBackoff = useMemo(
    () => ({
      fastRetries: 3,
      fastRetryDelayMs: 200,
      initialDelayMs: 1000,
      multiplier: 2,
      maxDelayMs: 30_000,
    }),
    [],
  );

  useEffect(() => {
    if (useJetstream) return;
    resetChunkTracking();
    startInitialBuffering();
    setHasCaughtUp(false);

    return () => {
      resetChunkTracking();
    };
  }, [useJetstream, resetChunkTracking, startInitialBuffering]);

  // Rejects out-of-order JetStream redeliveries; legacy NATS chunks lack streamSeq and bypass it.
  const lastAppliedStreamSeqRef = useRef<number>(-1);

  const syncStreamStateFromChunk = useCallback(
    (chunk: ChunkData) => {
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
    [queryClient, dialogId],
  );

  const handleNatsEvent = useCallback(
    (payload: unknown, messageType: NatsMessageType) => {
      const chunk = payload as ChunkData;
      if (featureFlags.debugNatsChunks.enabled()) {
        console.log('[mingo-nats] chunk received', { dialogId, messageType, chunk });
      }
      syncStreamStateFromChunk(chunk);
      coreProcessChunk(chunk, messageType);
    },
    [coreProcessChunk, syncStreamStateFromChunk, dialogId],
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

  const handleLegacySubscribed = useCallback(async () => {
    if (hasCaughtUp) return;
    setHasCaughtUp(true);
    await catchUpChunks();
  }, [hasCaughtUp, catchUpChunks]);

  const handleConnect = useCallback(() => {
    onConnectionChange?.(dialogId, true);
  }, [dialogId, onConnectionChange]);

  const handleDisconnect = useCallback(() => {
    onConnectionChange?.(dialogId, false);
  }, [dialogId, onConnectionChange]);

  const handleBeforeReconnect = useCallback(async () => {
    try {
      await apiClient.get('/api/me');
    } catch {
      // If refresh fails, apiClient will force-logout
    } finally {
      if (isDevTicketEnabled) {
        setToken(getAccessToken());
      }
    }
  }, [isDevTicketEnabled]);

  const { reconnectionCount: legacyReconnectionCount } = useNatsDialogSubscription({
    enabled: !useJetstream,
    dialogId,
    topics: MINGO_TOPICS,
    onEvent: handleNatsEvent,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onBeforeReconnect: handleBeforeReconnect,
    onSubscribed: handleLegacySubscribed,
    getNatsWsUrl,
    clientConfig,
    reconnectionBackoff,
  });

  useJetStreamDialogSubscription({
    enabled: useJetstream && isInitialOptStartSeqReady,
    dialogId,
    streamName: CHAT_CHUNKS_STREAM,
    topic: MINGO_JETSTREAM_TOPIC,
    optStartSeq: initialOptStartSeq,
    onEvent: handleJetStreamEvent,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onBeforeReconnect: handleBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
    reconnectionBackoff,
  });

  useEffect(() => {
    if (useJetstream) return;
    if (legacyReconnectionCount > 0 && dialogId) {
      resetAndCatchUp();
    }
  }, [useJetstream, legacyReconnectionCount, dialogId, resetAndCatchUp]);

  return null;
}
