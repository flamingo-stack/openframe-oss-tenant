import {
  type ChatApprovalStatus,
  type ChunkData,
  extractIncompleteMessageState,
  type Message,
  type MessageSegment,
  mergeHistoryWithRealtime,
  type PendingToolCallData,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  type ToolExecutionSegment,
  useJetStreamDialogSubscription,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebugMode } from '../contexts/DebugModeContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { ChatApiService } from '../services/chatApiService';
import { useTauriDialogSubscription } from '../services/natsTauri';
import { tokenService } from '../services/tokenService';
import { overrideToolTitle } from '../utils/applyToolTitle';
import { log } from '../utils/log';
import { isTauri } from '../utils/runtime';
import { useAssistantBranding } from './useAssistantBranding';
import { useChatApprovals } from './useChatApprovals';
import { useChatConfig } from './useChatConfig';
import { useChatMessages } from './useChatMessages';
import { CHAT_NATS_CLIENT_CONFIG, useChatNatsConfig } from './useChatNatsConfig';
import { useDialogMessages } from './useDialogMessages';

const CHAT_CHUNKS_STREAM = 'CHAT_CHUNKS';

// Rejection sentinel for a deliberately-cancelled subscription wait (view
// switch); the send flow treats it as a silent stop, not an error.
const SUBSCRIPTION_WAIT_CANCELLED = 'Subscription wait cancelled';

// Scan messages newest-to-oldest for the most recent pending approval
// (single or batch). Returns its requestId / approvalRequestId, or
// undefined if none. Used by sendMessage to optimistically cancel the
// active gate when the user interrupts with a new message.
function findLatestPendingApprovalId(msgs: Message[]): string | undefined {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (!Array.isArray(msg.content)) continue;
    for (let j = msg.content.length - 1; j >= 0; j--) {
      const seg = msg.content[j];
      if (seg.type === 'approval_request' && (!seg.status || seg.status === 'pending')) {
        return seg.data?.requestId;
      }
      if (seg.type === 'approval_batch' && (!seg.status || seg.status === 'pending')) {
        return seg.data?.approvalRequestId;
      }
    }
  }
  return undefined;
}

interface UseChatOptions {
  useApi?: boolean;
  apiToken?: string;
  apiBaseUrl?: string;
  useNats?: boolean;
  onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void;
  onTokenUsage?: (data: TokenUsageData) => void;
  onDialogClosed?: () => void;
}

export function useChat({
  useApi = true,
  useNats = false,
  onMetadataUpdate,
  onTokenUsage,
  onDialogClosed,
}: UseChatOptions = {}) {
  const { flags } = useFeatureFlags();

  // Core state
  const [isTyping, setIsTyping] = useState(false);
  const [natsStreaming, setNatsStreaming] = useState(false);
  const [natsDialogId, setNatsDialogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResumedDialog, setIsResumedDialog] = useState(false);
  const [isTicketPreview, setIsTicketPreview] = useState(false);
  const { getWsUrl, onBeforeReconnect } = useChatNatsConfig();

  // Refs for stream management
  const natsDoneResolverRef = useRef<null | (() => void)>(null);
  const subscriptionPromiseRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const escalatedApprovalsRef = useRef<
    Map<string, { command: string; explanation?: string; approvalType: string; toolCalls?: PendingToolCallData[] }>
  >(new Map());

  const { debugMode } = useDebugMode();
  const { quickActions, isSettingsLoading } = useChatConfig();
  const { assistantName, assistantAvatar } = useAssistantBranding();

  const apiServiceRef = useRef<ChatApiService | null>(null);
  if (!apiServiceRef.current) {
    apiServiceRef.current = new ChatApiService(debugMode);
    if (useApi) {
      Promise.all([tokenService.requestToken().catch(() => null), tokenService.initApiUrl().catch(() => null)]).catch(
        () => null,
      );
    }
  }

  useEffect(() => {
    apiServiceRef.current?.setDebugMode(debugMode);
  }, [debugMode]);

  const approvals = useChatApprovals();
  const messages = useChatMessages({
    onApprove: approvals.handleApproveRequest,
    onReject: approvals.handleRejectRequest,
  });

  const {
    historicalMessages,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistoricalMessages,
    isFetched: isHistoryFetched,
    initialOptStartSeq,
    rawHistoryIds,
    dataUpdatedAt: historyFetchedAt,
    fetchNextPage,
    escalatedApprovals,
    reset: resetDialogMessages,
  } = useDialogMessages(natsDialogId, {
    enabled: isResumedDialog,
    onApprove: approvals.handleApproveRequest,
    onReject: approvals.handleRejectRequest,
    approvalStatuses: approvals.approvalStatuses,
  });

  useEffect(() => {
    if (escalatedApprovals.size > 0) {
      escalatedApprovalsRef.current = escalatedApprovals;
    }
  }, [escalatedApprovals]);

  // Id of the in-flight streaming synthetic (the trailing assistant bubble
  // while a stream is live). Exempted from the merge's dedup so a still-growing
  // turn is never trimmed against history that doesn't contain it yet.
  const streamingMessageId = useMemo(() => {
    if (!natsStreaming) return null;
    const last = messages.messages[messages.messages.length - 1];
    return last?.role === 'assistant' ? last.id : null;
  }, [natsStreaming, messages.messages]);

  // Reconcile persisted history with realtime synthetics via the shared lib
  // merge instead of a hand-rolled positional cut.
  // Per-message `streamSeq` lets it drop a synthetic once history has
  // persisted past it, while keeping any not-yet-persisted (or in-flight) turn.
  const allMessages = useMemo(
    () =>
      mergeHistoryWithRealtime<Message>({
        processedHistory: historicalMessages,
        existingMessages: messages.messages,
        streamingMessageId,
        historyFetchedAt,
        historyMaxStreamSeq: initialOptStartSeq,
        rawHistoryIds,
      }),
    [historicalMessages, messages.messages, streamingMessageId, historyFetchedAt, initialOptStartSeq, rawHistoryIds],
  );

  const messagesRef = useRef(messages);
  const approvalsRef = useRef(approvals);
  const allMessagesRef = useRef(allMessages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    approvalsRef.current = approvals;
  }, [approvals]);

  useEffect(() => {
    allMessagesRef.current = allMessages;
  }, [allMessages]);

  const realtimeCallbacks = useMemo(
    () => ({
      onStreamStart: () => {
        log.info('nats:chat', 'stream started');
        setNatsStreaming(true);
        setIsTyping(true);
        messagesRef.current.resetCurrentMessageSegments();
        messagesRef.current.ensureAssistantMessage();
      },
      onStreamEnd: () => {
        log.info('nats:chat', 'stream ended');
        setNatsStreaming(false);
        setIsTyping(false);
        const resolve = natsDoneResolverRef.current;
        natsDoneResolverRef.current = null;
        if (resolve) resolve();
      },
      onMetadata: onMetadataUpdate,
      onTokenUsage,
      onSegmentsUpdate: (segments: MessageSegment[], metadata?: SegmentsUpdateMetadata) => {
        if (metadata?.isCompacting) {
          setNatsStreaming(false);
          setIsTyping(false);
        } else {
          setNatsStreaming(true);
        }
        if (metadata?.append) {
          messagesRef.current.appendSegmentsToLastAssistant(segments, metadata?.streamSeq);
        } else {
          messagesRef.current.ensureAssistantMessage();
          messagesRef.current.updateSegments(segments, metadata?.streamSeq);
        }
      },
      onError: (_errorText: string) => {
        setNatsStreaming(false);
        setIsTyping(false);
        const resolve = natsDoneResolverRef.current;
        natsDoneResolverRef.current = null;
        if (resolve) resolve();
      },
      onApprove: (requestId?: string) => approvalsRef.current.handleApproveRequest(requestId),
      onReject: (requestId?: string) => approvalsRef.current.handleRejectRequest(requestId),
      onApprovalResolved: (requestId: string, status: ChatApprovalStatus) => {
        if (status === 'approved' || status === 'rejected') {
          // Live messages — covers approvals in the current session bubble.
          messagesRef.current.updateApprovalStatusById(requestId, status);
          // Historical messages — when the originating approval lives in a
          // resumed-dialog bubble owned by React Query, the live-state
          // updater above misses it. The approvalStatuses map drives
          // `processHistoricalMessages` to overlay the new status.
          approvalsRef.current.applyResolvedStatus(requestId, status);
        }
      },
      onToolExecuted: (segment: ToolExecutionSegment) => {
        const execId = segment.data.toolExecutionRequestId;
        if (execId) messagesRef.current.updateToolExecutionById(execId, segment.data);
      },
      onEscalatedApproval: (
        requestId: string,
        data: { command: string; explanation?: string; approvalType: string },
      ) => {
        approvalsRef.current.handleEscalatedApproval(requestId, data);
      },
      onEscalatedApprovalResult: (
        requestId: string,
        approved: boolean,
        data: { command: string; explanation?: string; approvalType: string },
      ) => {
        approvalsRef.current.handleEscalatedApprovalResult(requestId, approved, data);
      },
      onDirectMessage: (text: string, metadata?: { ownerType?: string; displayName?: string; streamSeq?: number }) => {
        if (metadata?.ownerType === 'CLIENT') {
          // Echo of own message in direct mode — resolve the send flow
          setNatsStreaming(false);
          setIsTyping(false);
          const resolve = natsDoneResolverRef.current;
          natsDoneResolverRef.current = null;
          if (resolve) resolve();
          return;
        }
        const directMessage: Message = {
          id: `direct-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          name: metadata?.displayName || 'Technician',
          authorType: 'admin',
          content: text,
          timestamp: new Date(),
          streamSeq: metadata?.streamSeq,
        };
        messagesRef.current.addMessage(directMessage);
      },
      onDialogClosed: () => {
        onDialogClosed?.();
      },
      onSystemMessage: (text: string, metadata?: { streamSeq?: number }) => {
        const systemMessage: Message = {
          id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          name: text,
          authorType: 'system',
          content: '',
          timestamp: new Date(),
          streamSeq: metadata?.streamSeq,
        };
        messagesRef.current.addMessage(systemMessage);
      },
    }),
    [onMetadataUpdate, onTokenUsage, onDialogClosed],
  );

  const incompleteState = useMemo(() => {
    if (!isResumedDialog) return undefined;

    const currentMessages = allMessages;
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
        name: assistantName ?? 'Fae',
        timestamp: lastAssistantTimestamp,
      };

      return extractIncompleteMessageState(completeAssistantMessage);
    }

    return undefined;
  }, [allMessages, isResumedDialog, assistantName]);

  const isCompacting = useMemo(() => {
    const lastMsg = allMessages[allMessages.length - 1];
    if (lastMsg?.role !== 'assistant' || !Array.isArray(lastMsg.content)) return false;
    const tail = lastMsg.content[lastMsg.content.length - 1];
    return tail?.type === 'context_compaction' && tail.status === 'started';
  }, [allMessages]);

  const enhancedInitialState = useMemo(() => {
    if (!incompleteState && escalatedApprovalsRef.current.size === 0) return undefined;

    return {
      ...incompleteState,
      escalatedApprovals: escalatedApprovalsRef.current.size > 0 ? escalatedApprovalsRef.current : undefined,
    };
  }, [incompleteState]);

  const { processChunk: processRealtimeChunk, reset: resetChunkProcessor } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT'],
    approvalStatuses: approvals.approvalStatuses,
    initialState: enhancedInitialState,
    enableThinking: flags.thinking,
    batchApprovalsEnabled: flags['batch-approval'],
  });

  const natsDialogIdRef = useRef(natsDialogId);

  useEffect(() => {
    natsDialogIdRef.current = natsDialogId;
  }, [natsDialogId]);

  // JetStream may redeliver an already-applied streamSeq during reconnect; drop dupes.
  const lastAppliedStreamSeqRef = useRef<number>(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dialog change is the reset trigger
  useEffect(() => {
    lastAppliedStreamSeqRef.current = -1;
    hasAppliedChunkRef.current = false;
  }, [natsDialogId]);

  // Wall-clock time of the last applied chunk, for the stall watchdog below.
  const lastChunkAtRef = useRef<number>(Date.now());
  const [isStalled, setIsStalled] = useState(false);

  const hasAppliedChunkRef = useRef(false);

  const handleJetStreamEvent = useCallback(
    (payload: unknown) => {
      const chunk = payload as ChunkData;
      if (typeof chunk.streamSeq === 'number') {
        if (chunk.streamSeq <= lastAppliedStreamSeqRef.current) return;
        lastAppliedStreamSeqRef.current = chunk.streamSeq;
      }
      if (!hasAppliedChunkRef.current) {
        hasAppliedChunkRef.current = true;
        log.info('nats:chat', 'first chunk applied', { streamSeq: chunk.streamSeq });
      }
      lastChunkAtRef.current = Date.now();
      setIsStalled(false);
      processRealtimeChunk(overrideToolTitle(chunk));
    },
    [processRealtimeChunk],
  );

  const handleJetStreamSubscribed = useCallback(() => {
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.resolve();
      subscriptionPromiseRef.current = null;
    }
  }, []);

  const isInitialOptStartSeqReady = !isResumedDialog || isHistoryFetched;

  // Tauri path: Rust owns the JetStream consumer, webview consumes via IPC.
  const { isSubscribed: tauriIsSubscribed } = useTauriDialogSubscription({
    enabled: isTauri && useNats && !!natsDialogId && isInitialOptStartSeqReady,
    dialogId: isTauri ? natsDialogId : null,
    optStartSeq: initialOptStartSeq,
    onEvent: handleJetStreamEvent,
    onSubscribed: handleJetStreamSubscribed,
  });

  // Vite-only fallback: legacy WS-based JetStream hook from the core lib.
  const { isSubscribed: wsIsSubscribed } = useJetStreamDialogSubscription({
    enabled: !isTauri && useNats && !!natsDialogId && isInitialOptStartSeqReady,
    dialogId: !isTauri ? natsDialogId : null,
    streamName: CHAT_CHUNKS_STREAM,
    topic: 'message',
    optStartSeq: initialOptStartSeq,
    onEvent: handleJetStreamEvent,
    onSubscribed: handleJetStreamSubscribed,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
    clientConfig: CHAT_NATS_CLIENT_CONFIG,
  });

  const isSubscribed = isTauri ? tauriIsSubscribed : wsIsSubscribed;

  // Stall watchdog: while streaming and visible, surface `isStalled` if no
  // chunks have arrived for 30s. Hidden tabs suppress the timer because the
  // IPC queue still drains; chunks resume on focus.
  useEffect(() => {
    if (!natsStreaming) {
      setIsStalled(false);
      return;
    }
    lastChunkAtRef.current = Date.now();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        lastChunkAtRef.current = Date.now();
        setIsStalled(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastChunkAtRef.current > 30_000) {
        log.warn('nats:chat', 'stream stalled — no chunks for 30s');
        setIsStalled(true);
      }
    }, 5_000);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [natsStreaming]);

  const waitForNatsSubscription = useCallback(
    async (expectedDialogId: string): Promise<void> => {
      if (isSubscribed && natsDialogIdRef.current === expectedDialogId) {
        return;
      }

      return new Promise<void>((resolve, reject) => {
        subscriptionPromiseRef.current = { resolve, reject };

        const timeout = setTimeout(() => {
          if (subscriptionPromiseRef.current) {
            subscriptionPromiseRef.current.reject(new Error('Subscription timeout'));
            subscriptionPromiseRef.current = null;
          }
        }, 30000);

        const originalResolve = resolve;
        const originalReject = reject;

        subscriptionPromiseRef.current = {
          resolve: () => {
            clearTimeout(timeout);
            originalResolve();
          },
          reject: error => {
            clearTimeout(timeout);
            originalReject(error);
          },
        };
      });
    },
    [isSubscribed],
  );

  useEffect(() => {
    return () => {
      if (subscriptionPromiseRef.current) {
        subscriptionPromiseRef.current.reject(new Error('Component unmounted'));
        subscriptionPromiseRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);

      // Sending a message while an approval is pending is an interrupt —
      // backend will cancel that approval and emit APPROVAL_RESULT (rejected)
      // a moment later. Flip the latest pending one optimistically so the
      // card resolves at the same instant the user-message bubble appears,
      // avoiding a layout jump between the two updates.
      const pendingId = findLatestPendingApprovalId(allMessagesRef.current);
      if (pendingId) {
        messagesRef.current.updateApprovalStatusById(pendingId, 'rejected');
        approvalsRef.current.applyResolvedStatus(pendingId, 'rejected');
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        name: 'You',
        content: text,
        timestamp: new Date(),
      };
      messages.addMessage(userMessage);

      setIsTyping(true);
      setNatsStreaming(true);
      messages.resetCurrentMessageSegments();

      try {
        if (!useNats) {
          throw new Error('NATS is required for incoming messages (SSE removed)');
        }

        const api = apiServiceRef.current;
        if (!api) throw new Error('API service not initialized');

        const dialogId = natsDialogId || (await api.createDialog());
        if (dialogId !== natsDialogId) {
          setNatsDialogId(dialogId);
        }

        await waitForNatsSubscription(dialogId);

        const waitForNatsDone = new Promise<void>(resolve => {
          natsDoneResolverRef.current = resolve;
        });

        await api.sendMessage({ dialogId, content: text, chatType: 'CLIENT_CHAT' });

        await waitForNatsDone;
      } catch (err) {
        const errorText = err instanceof Error ? err.message : String(err);
        if (!errorText.toLowerCase().includes('network error')) {
          setError(errorText);
          messages.addErrorMessage(errorText);
        }
      } finally {
        setIsTyping(false);
        setNatsStreaming(false);
        natsDoneResolverRef.current = null;
      }
    },
    [messages, useNats, natsDialogId, waitForNatsSubscription],
  );

  const stopGeneration = useCallback(async () => {
    const api = apiServiceRef.current;
    const dialogId = natsDialogId;
    if (!api || !dialogId) return;

    try {
      await api.stopGeneration({ dialogId, chatType: 'CLIENT_CHAT' });
    } catch (err) {
      console.error('[CHAT] Failed to stop generation:', err);
    } finally {
      setIsTyping(false);
      setNatsStreaming(false);
      const resolve = natsDoneResolverRef.current;
      natsDoneResolverRef.current = null;
      if (resolve) resolve();
    }
  }, [natsDialogId]);

  const handleQuickAction = useCallback(
    (actionText: string) => {
      sendMessage(actionText);
    },
    [sendMessage],
  );

  // Settle any pending waitForNatsSubscription before switching views: its
  // 30s timeout rejects whatever the ref points to *at firing time*, so an
  // abandoned wait would kill a fresh one and surface a stale
  // "Subscription timeout" in the new view.
  const cancelSubscriptionWait = useCallback(() => {
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.reject(new Error(SUBSCRIPTION_WAIT_CANCELLED));
      subscriptionPromiseRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    messages.clearMessages();
    setIsTyping(false);
    setNatsStreaming(false);
    setError(null);
    setNatsDialogId(null);
    setIsResumedDialog(false);
    setIsTicketPreview(false);
    escalatedApprovalsRef.current.clear();
    approvals.clearApprovals();
    resetChunkProcessor();
    resetDialogMessages();
    apiServiceRef.current?.reset();
    cancelSubscriptionWait();
  }, [messages, approvals, resetChunkProcessor, resetDialogMessages, cancelSubscriptionWait]);

  const showTicketPreview = useCallback(
    (ticket: { title: string; description?: string }) => {
      messages.clearMessages();
      setIsTyping(false);
      setNatsStreaming(false);
      setError(null);
      setNatsDialogId(null);
      setIsResumedDialog(false);
      setIsTicketPreview(true);
      escalatedApprovalsRef.current.clear();
      approvals.clearApprovals();
      resetChunkProcessor();
      resetDialogMessages();
      apiServiceRef.current?.reset();
      cancelSubscriptionWait();

      const content = [
        'Your request has been received. We will contact you shortly.',
        '',
        'Subject:',
        ticket.title,
        '',
        'Description:',
        ticket.description || '(No description provided)',
      ].join('\n');

      const syntheticMessage: Message = {
        id: `ticket-preview-${Date.now()}`,
        role: 'assistant',
        name: assistantName ?? 'Fae',
        content,
        timestamp: new Date(),
        avatar: assistantAvatar,
      };

      messages.addMessage(syntheticMessage);
    },
    [
      messages,
      approvals,
      resetChunkProcessor,
      resetDialogMessages,
      assistantName,
      assistantAvatar,
      cancelSubscriptionWait,
    ],
  );

  const resumeDialog = useCallback(
    async (dialogId: string): Promise<boolean> => {
      try {
        cancelSubscriptionWait();
        setError(null);
        messages.clearMessages();
        setIsTyping(false);
        setNatsStreaming(false);
        setIsTicketPreview(false);
        approvals.clearApprovals();
        setIsResumedDialog(true);

        setNatsDialogId(dialogId);
        natsDialogIdRef.current = dialogId;

        if (apiServiceRef.current) {
          apiServiceRef.current.setDialogId(dialogId);
        }

        await waitForNatsSubscription(dialogId);

        return true;
      } catch (error) {
        // A newer view switch cancelled this resume — its state is no longer
        // ours to clobber.
        if (error instanceof Error && error.message === SUBSCRIPTION_WAIT_CANCELLED) {
          return false;
        }
        setError(error instanceof Error ? error.message : 'Failed to resume dialog');
        setIsResumedDialog(false);
        return false;
      }
    },
    [messages, approvals, waitForNatsSubscription, cancelSubscriptionWait],
  );

  return {
    messages: allMessages,
    isTyping,
    isStreaming: natsStreaming,
    isStalled,
    isCompacting,
    error,
    dialogId: natsDialogId,
    sendMessage,
    stopGeneration,
    handleQuickAction,
    clearMessages,
    resumeDialog,
    showTicketPreview,
    quickActions,
    isSettingsLoading,
    hasMessages: allMessages.length > 0,
    isTicketPreview,
    awaitingTechnicianResponse: approvals.awaitingTechnicianResponse,
    isLoadingHistory: isLoadingHistoricalMessages,
    isResumedDialog,
    hasNextPage,
    isFetchingNextPage,
    loadMoreMessages: fetchNextPage,
  };
}
