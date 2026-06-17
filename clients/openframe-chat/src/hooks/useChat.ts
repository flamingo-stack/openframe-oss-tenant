import {
  type ChatApprovalStatus,
  type ChunkData,
  extractIncompleteMessageState,
  type Message,
  type MessageSegment,
  type NatsMessageType,
  type PendingToolCallData,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  type ToolExecutionSegment,
  useJetStreamDialogSubscription,
  useNatsDialogSubscription,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebugMode } from '../contexts/DebugModeContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { ChatApiService } from '../services/chatApiService';
import { tokenService } from '../services/tokenService';
import { overrideToolTitle } from '../utils/applyToolTitle';
import { log } from '../utils/log';
import { useAssistantBranding } from './useAssistantBranding';
import { useChatApprovals } from './useChatApprovals';
import { useChatConfig } from './useChatConfig';
import { useChatMessages } from './useChatMessages';
import { CHAT_NATS_CLIENT_CONFIG, useChatNatsConfig } from './useChatNatsConfig';
import { useChunkCatchup } from './useChunkCatchup';
import { useDialogMessages } from './useDialogMessages';

const CHAT_CHUNKS_STREAM = 'CHAT_CHUNKS';

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
  const [useJetstream] = useState(() => !!flags['ai-streaming-jetstream']);

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
  const hasCaughtUp = useRef(false);
  const subscriptionPromiseRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const escalatedApprovalsRef = useRef<
    Map<string, { command: string; explanation?: string; approvalType: string; toolCalls?: PendingToolCallData[] }>
  >(new Map());

  const { debugMode } = useDebugMode();
  const { quickActions } = useChatConfig();
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

  const allMessages = useMemo(() => {
    if (messages.messages.length === 0) return historicalMessages;

    if (isResumedDialog && messages.messages[0]?.role === 'assistant') {
      let cutIndex = historicalMessages.length;
      for (let i = historicalMessages.length - 1; i >= 0; i--) {
        if (historicalMessages[i].role === 'assistant') {
          cutIndex = i;
        } else {
          break;
        }
      }
      return [...historicalMessages.slice(0, cutIndex), ...messages.messages];
    }

    return [...historicalMessages, ...messages.messages];
  }, [historicalMessages, messages.messages, isResumedDialog]);

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
        setNatsStreaming(true);
        setIsTyping(true);
        messagesRef.current.resetCurrentMessageSegments();
        messagesRef.current.ensureAssistantMessage();
      },
      onStreamEnd: () => {
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
          messagesRef.current.appendSegmentsToLastAssistant(segments);
        } else {
          messagesRef.current.ensureAssistantMessage();
          messagesRef.current.updateSegments(segments);
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
      onDirectMessage: (text: string, metadata?: { ownerType?: string; displayName?: string }) => {
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
        };
        messagesRef.current.addMessage(directMessage);
      },
      onDialogClosed: () => {
        onDialogClosed?.();
      },
      onSystemMessage: (text: string) => {
        const systemMessage: Message = {
          id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          name: text,
          authorType: 'system',
          content: '',
          timestamp: new Date(),
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

  const handleRealtimeEvent = useCallback(
    (chunk: any) => {
      processRealtimeChunk(overrideToolTitle(chunk));
    },
    [processRealtimeChunk],
  );

  const {
    catchUpChunks,
    processChunk: catchupProcessChunk,
    resetChunkTracking,
    startInitialBuffering,
    resetAndCatchUp,
  } = useChunkCatchup({
    dialogId: natsDialogId,
    onChunkReceived: handleRealtimeEvent,
  });

  const handleNatsEvent = useCallback(
    (chunk: any, messageType: NatsMessageType) => {
      catchupProcessChunk(chunk, messageType);
    },
    [catchupProcessChunk],
  );

  const natsDialogIdRef = useRef(natsDialogId);

  useEffect(() => {
    natsDialogIdRef.current = natsDialogId;
  }, [natsDialogId]);

  useEffect(() => {
    if (useJetstream) return;
    if (!natsDialogId) return;

    resetChunkTracking();
    startInitialBuffering();
    hasCaughtUp.current = false;
  }, [useJetstream, natsDialogId, resetChunkTracking, startInitialBuffering]);

  const handleNatsSubscribed = useCallback(async () => {
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.resolve();
      subscriptionPromiseRef.current = null;
    }

    if (useJetstream) return;
    if (!hasCaughtUp.current && natsDialogId) {
      hasCaughtUp.current = true;
      try {
        await catchUpChunks();
      } catch (error) {
        log.warn('chat', 'catch-up after NATS subscribe failed', String(error));
        hasCaughtUp.current = false;
      }
    }
  }, [useJetstream, natsDialogId, catchUpChunks]);

  // JetStream may redeliver an already-applied streamSeq during reconnect; drop dupes.
  const lastAppliedStreamSeqRef = useRef<number>(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dialog change is the reset trigger
  useEffect(() => {
    if (!useJetstream) return;
    lastAppliedStreamSeqRef.current = -1;
  }, [useJetstream, natsDialogId]);

  const handleJetStreamEvent = useCallback(
    (payload: unknown) => {
      const chunk = payload as ChunkData;
      if (typeof chunk.streamSeq === 'number') {
        if (chunk.streamSeq <= lastAppliedStreamSeqRef.current) return;
        lastAppliedStreamSeqRef.current = chunk.streamSeq;
      }
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

  const topics = useMemo((): NatsMessageType[] => ['message'], []);

  const { isSubscribed: legacyIsSubscribed, reconnectionCount: legacyReconnectionCount } = useNatsDialogSubscription({
    enabled: useNats && !useJetstream && !!natsDialogId,
    dialogId: natsDialogId,
    topics,
    onEvent: handleNatsEvent,
    onSubscribed: handleNatsSubscribed,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
    clientConfig: CHAT_NATS_CLIENT_CONFIG,
  });

  const isInitialOptStartSeqReady = !isResumedDialog || isHistoryFetched;

  const { isSubscribed: jetstreamIsSubscribed } = useJetStreamDialogSubscription({
    enabled: useNats && useJetstream && !!natsDialogId && isInitialOptStartSeqReady,
    dialogId: natsDialogId,
    streamName: CHAT_CHUNKS_STREAM,
    topic: 'message',
    optStartSeq: initialOptStartSeq,
    onEvent: handleJetStreamEvent,
    onSubscribed: handleJetStreamSubscribed,
    onBeforeReconnect,
    getNatsWsUrl: getWsUrl,
    clientConfig: CHAT_NATS_CLIENT_CONFIG,
  });

  const isSubscribed = useJetstream ? jetstreamIsSubscribed : legacyIsSubscribed;

  useEffect(() => {
    if (useJetstream) return;
    if (legacyReconnectionCount > 0 && natsDialogId) {
      log.info('nats:chat', `reconnected (count: ${legacyReconnectionCount}) — catching up missed messages`);
      resetAndCatchUp().catch((error: unknown) => {
        log.error('nats:chat', 'failed to catch up after reconnection', String(error));
      });
    }
  }, [useJetstream, legacyReconnectionCount, natsDialogId, resetAndCatchUp]);

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

  const clearMessages = useCallback(() => {
    messages.clearMessages();
    setIsTyping(false);
    setNatsStreaming(false);
    setError(null);
    setNatsDialogId(null);
    setIsResumedDialog(false);
    setIsTicketPreview(false);
    hasCaughtUp.current = false;
    escalatedApprovalsRef.current.clear();
    approvals.clearApprovals();
    resetChunkTracking();
    resetChunkProcessor();
    resetDialogMessages();
    apiServiceRef.current?.reset();
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.reject(new Error('Chat cleared'));
      subscriptionPromiseRef.current = null;
    }
  }, [messages, approvals, resetChunkTracking, resetChunkProcessor, resetDialogMessages]);

  const showTicketPreview = useCallback(
    (ticket: { title: string; description?: string }) => {
      messages.clearMessages();
      setIsTyping(false);
      setNatsStreaming(false);
      setError(null);
      setNatsDialogId(null);
      setIsResumedDialog(false);
      setIsTicketPreview(true);
      hasCaughtUp.current = false;
      escalatedApprovalsRef.current.clear();
      approvals.clearApprovals();
      resetChunkTracking();
      resetChunkProcessor();
      resetDialogMessages();
      apiServiceRef.current?.reset();

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
    [messages, approvals, resetChunkTracking, resetChunkProcessor, resetDialogMessages, assistantName, assistantAvatar],
  );

  const resumeDialog = useCallback(
    async (dialogId: string): Promise<boolean> => {
      try {
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
        setError(error instanceof Error ? error.message : 'Failed to resume dialog');
        setIsResumedDialog(false);
        hasCaughtUp.current = false;
        return false;
      }
    },
    [messages, approvals, waitForNatsSubscription],
  );

  return {
    messages: allMessages,
    isTyping,
    isStreaming: natsStreaming,
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
