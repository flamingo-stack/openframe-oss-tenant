'use client';

import {
  buildNatsWsUrl,
  type ChunkData,
  extractIncompleteMessageState,
  type MessageSegment,
  type NatsMessageType,
  useNatsDialogSubscription,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runtimeEnv } from '@/lib/runtime-config';
import { STORAGE_KEYS } from '../../tickets/constants';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { CoreMessage } from '../types/message.types';
import { useMingoChunkCatchup } from './use-mingo-chunk-catchup';

const MINGO_TOPICS: NatsMessageType[] = ['admin-message'] as const;

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
  const [connectionState, _setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const onChunkReceivedRef = useRef(onChunkReceived);
  const catchupRefs = useRef<Map<string, any>>(new Map());

  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();
  const [_token, setToken] = useState<string | null>(isDevTicketEnabled ? getAccessToken() : null);

  const { resetUnread } = useMingoMessagesStore();

  useEffect(() => {
    onChunkReceivedRef.current = onChunkReceived;
  }, [onChunkReceived]);

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

  // NATS client configuration
  const _clientConfig = useMemo(
    () => ({
      name: 'openframe-frontend-mingo',
      user: 'machine',
      pass: '',
    }),
    [],
  );

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
  };
}

// Per-dialog chunk processing hook
interface UseDialogChunkProcessorOptions {
  onApprove?: (requestId?: string) => void | Promise<void>;
  onReject?: (requestId?: string) => void | Promise<void>;
  approvalStatuses?: Record<string, any>;
}

function useDialogChunkProcessor(dialogId: string, options: UseDialogChunkProcessorOptions = {}) {
  const { onApprove, onReject, approvalStatuses } = options;
  const queryClient = useQueryClient();

  const {
    messagesByDialog,
    getMessages,
    addMessage,
    updateMessage,
    setTyping,
    getTyping,
    setStreamingMessage,
    getStreamingMessage,
    updateStreamingMessageSegments,
    getOrCreateAccumulator,
  } = useMingoMessagesStore();

  useEffect(() => {
    if (onApprove || onReject) {
      getOrCreateAccumulator(dialogId, { onApprove, onReject });
    }
  }, [dialogId, onApprove, onReject, getOrCreateAccumulator]);

  const ensureAssistantMessage = useCallback(() => {
    const currentStreaming = getStreamingMessage(dialogId);
    if (currentStreaming) return;

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
  }, [dialogId, getStreamingMessage, setStreamingMessage, addMessage]);

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

  useEffect(() => {
    if (!incompleteState) return;

    const hasIncompleteContent =
      (incompleteState.existingSegments && incompleteState.existingSegments.length > 0) ||
      (incompleteState.pendingApprovals && incompleteState.pendingApprovals.size > 0) ||
      (incompleteState.executingTools && incompleteState.executingTools.size > 0);

    if (hasIncompleteContent && !getTyping(dialogId)) {
      setTyping(dialogId, true);
    }
  }, [dialogId, incompleteState, getTyping, setTyping]);

  const realtimeCallbacks = useMemo(
    () => ({
      onStreamStart: () => {
        ensureAssistantMessage();
        setTyping(dialogId, true);
      },

      onStreamEnd: () => {
        setTyping(dialogId, false);
        setStreamingMessage(dialogId, null);
        queryClient.invalidateQueries({ queryKey: ['mingo-dialog-messages', dialogId] });
      },

      onSegmentsUpdate: (segments: MessageSegment[]) => {
        setTyping(dialogId, true);
        ensureAssistantMessage();
        updateStreamingMessageSegments(dialogId, segments);
      },

      onError: (error: string) => {
        console.error('[DialogSubscription] Stream error:', error);
        setTyping(dialogId, false);
        setStreamingMessage(dialogId, null);
        addErrorMessage(error);
      },

      onApprove,
      onReject,
    }),
    [
      dialogId,
      ensureAssistantMessage,
      setTyping,
      setStreamingMessage,
      updateStreamingMessageSegments,
      addErrorMessage,
      onApprove,
      onReject,
      queryClient.invalidateQueries,
    ],
  );

  const { processChunk: processorProcessChunk } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    approvalStatuses: approvalStatuses || {},
    initialState: incompleteState,
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
}

export function DialogSubscription({ dialogId, onApprove, onReject, approvalStatuses }: DialogSubscriptionProps) {
  const [apiBaseUrl] = useState<string | null>(getApiBaseUrl);
  const [hasCaughtUp, setHasCaughtUp] = useState(false);
  const isDevTicketEnabled = runtimeEnv.enableDevTicketObserver();
  const [token] = useState<string | null>(isDevTicketEnabled ? getAccessToken() : null);

  const { processChunk: processorProcessChunk } = useDialogChunkProcessor(dialogId, {
    onApprove,
    onReject,
    approvalStatuses,
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
  } = useMingoChunkCatchup({
    dialogId,
    onChunkReceived: useCallback((chunk: ChunkData, _messageType: NatsMessageType) => {
      processorRef.current(chunk);
    }, []),
  });

  // NATS WebSocket URL
  const getNatsWsUrl = useMemo(() => {
    return (): string | null => {
      if (!apiBaseUrl) return null;
      if (isDevTicketEnabled && !token) return null;
      return buildNatsWsUrl(apiBaseUrl, {
        token: token || undefined,
        includeAuthParam: isDevTicketEnabled,
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

  useEffect(() => {
    resetChunkTracking();
    startInitialBuffering();
    setHasCaughtUp(false);

    return () => {
      resetChunkTracking();
    };
  }, [resetChunkTracking, startInitialBuffering]);

  const handleNatsEvent = useCallback(
    (payload: unknown, messageType: NatsMessageType) => {
      coreProcessChunk(payload as ChunkData, messageType);
    },
    [coreProcessChunk],
  );

  const handleSubscribed = useCallback(async () => {
    if (!hasCaughtUp) {
      setHasCaughtUp(true);
      await catchUpChunks();
    }
  }, [hasCaughtUp, catchUpChunks]);

  useNatsDialogSubscription({
    enabled: true,
    dialogId,
    topics: MINGO_TOPICS,
    onEvent: handleNatsEvent,
    onConnect: () => {},
    onDisconnect: () => {},
    onSubscribed: handleSubscribed,
    getNatsWsUrl,
    clientConfig,
  });

  return null;
}
