import {
  buildNatsWsUrl,
  extractIncompleteMessageState,
  type Message,
  type MessageSegment,
  type NatsMessageType,
  processHistoricalMessages,
  useNatsDialogSubscription,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import faeAvatar from '../assets/fae-avatar.png';
import { useDebugMode } from '../contexts/DebugModeContext';
import { ChatApiService } from '../services/chatApiService';
import { dialogGraphQlService } from '../services/dialogGraphQLService';
import { tokenService } from '../services/tokenService';
import { useChatApprovals } from './useChatApprovals';
import { useChatConfig } from './useChatConfig';
import { useChatMessages } from './useChatMessages';
import { useChunkCatchup } from './useChunkCatchup';

interface UseChatOptions {
  useApi?: boolean;
  apiToken?: string;
  apiBaseUrl?: string;
  useNats?: boolean;
  onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void;
}

export function useChat({ useApi = true, useNats = false, onMetadataUpdate }: UseChatOptions = {}) {
  // Core state
  const [isTyping, setIsTyping] = useState(false);
  const [natsStreaming, setNatsStreaming] = useState(false);
  const [natsDialogId, setNatsDialogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isResumedDialog, setIsResumedDialog] = useState(false);
  const [token, setToken] = useState(tokenService.getCurrentToken());
  const [apiBaseUrl, setApiBaseUrl] = useState(tokenService.getCurrentApiBaseUrl());

  // Refs for stream management
  const natsDoneResolverRef = useRef<null | (() => void)>(null);
  const hasCaughtUp = useRef(false);
  const subscriptionPromiseRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const escalatedApprovalsRef = useRef<Map<string, { command: string; explanation?: string; approvalType: string }>>(
    new Map(),
  );

  const { debugMode } = useDebugMode();
  const { quickActions } = useChatConfig();

  useEffect(() => {
    return tokenService.onTokenUpdate(setToken);
  }, []);

  useEffect(() => {
    return tokenService.onApiUrlUpdate(setApiBaseUrl);
  }, []);

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

  const messagesRef = useRef(messages);
  const approvalsRef = useRef(approvals);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    approvalsRef.current = approvals;
  }, [approvals]);

  const realtimeCallbacks = useMemo(
    () => ({
      onStreamStart: () => {
        setNatsStreaming(true);
        setIsTyping(true);
        messagesRef.current.resetCurrentMessageSegments();
      },
      onStreamEnd: () => {
        setNatsStreaming(false);
        setIsTyping(false);
        const resolve = natsDoneResolverRef.current;
        natsDoneResolverRef.current = null;
        if (resolve) resolve();
      },
      onMetadata: onMetadataUpdate,
      onSegmentsUpdate: (segments: MessageSegment[]) => {
        messagesRef.current.ensureAssistantMessage();
        setNatsStreaming(true);
        messagesRef.current.updateSegments(segments);
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
    }),
    [onMetadataUpdate],
  );

  const incompleteState = useMemo(() => {
    if (!isResumedDialog) return undefined;

    const currentMessages = messages.messages;
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
        name: 'Fae',
        timestamp: lastAssistantTimestamp,
      };

      return extractIncompleteMessageState(completeAssistantMessage);
    }

    return undefined;
  }, [messages.messages, isResumedDialog]);

  useEffect(() => {
    if (!isResumedDialog || !incompleteState) return;

    const hasIncompleteContent =
      (incompleteState.existingSegments && incompleteState.existingSegments.length > 0) ||
      (incompleteState.pendingApprovals && incompleteState.pendingApprovals.size > 0) ||
      (incompleteState.executingTools && incompleteState.executingTools.size > 0);

    if (hasIncompleteContent && !isTyping) {
      setIsTyping(true);
    }
  }, [isResumedDialog, incompleteState, isTyping]);

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
  });

  const handleRealtimeEvent = useCallback(
    (chunk: any) => {
      processRealtimeChunk(chunk);
    },
    [processRealtimeChunk],
  );

  const { catchUpChunks, resetChunkTracking, startInitialBuffering, resetAndCatchUp } = useChunkCatchup({
    dialogId: natsDialogId,
    onChunkReceived: handleRealtimeEvent,
  });

  const natsDialogIdRef = useRef(natsDialogId);

  useEffect(() => {
    natsDialogIdRef.current = natsDialogId;
  }, [natsDialogId]);

  useEffect(() => {
    if (!natsDialogId) return;

    resetChunkTracking();
    startInitialBuffering();
    hasCaughtUp.current = false;
  }, [natsDialogId, resetChunkTracking, startInitialBuffering]);

  const handleNatsSubscribed = useCallback(async () => {
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.resolve();
      subscriptionPromiseRef.current = null;
    }

    if (!hasCaughtUp.current && natsDialogId) {
      hasCaughtUp.current = true;
      try {
        await catchUpChunks();
      } catch (_error) {
        hasCaughtUp.current = false;
      }
    }
  }, [natsDialogId, catchUpChunks]);

  const getNatsWsUrl = useMemo(() => {
    return (): string => {
      if (!apiBaseUrl || !token) return '';
      return buildNatsWsUrl(apiBaseUrl, { token, includeAuthParam: true });
    };
  }, [apiBaseUrl, token]);

  const topics = useMemo((): NatsMessageType[] => ['message'], []);

  const clientConfig = useMemo(
    () => ({
      name: 'openframe-chat',
      user: 'machine',
      pass: '',
    }),
    [],
  );

  const handleBeforeReconnect = useCallback(async () => {
    console.log('[CHAT] NATS disconnected, refreshing token before reconnect...');
    await tokenService.refreshToken();
  }, []);

  const { isSubscribed, reconnectionCount } = useNatsDialogSubscription({
    enabled: useNats && !!natsDialogId,
    dialogId: natsDialogId,
    topics,
    onEvent: handleRealtimeEvent,
    onSubscribed: handleNatsSubscribed,
    onBeforeReconnect: handleBeforeReconnect,
    getNatsWsUrl,
    clientConfig,
  });

  useEffect(() => {
    if (reconnectionCount > 0 && natsDialogId) {
      console.log(`[CHAT] NATS reconnected (count: ${reconnectionCount}), catching up missed messages...`);
      resetAndCatchUp().catch((error: unknown) => {
        console.error('[CHAT] Failed to catch up after reconnection:', error);
      });
    }
  }, [reconnectionCount, natsDialogId, resetAndCatchUp]);

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

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        name: 'Fae',
        content: [],
        timestamp: new Date(),
        avatar: faeAvatar,
      };
      messages.addMessage(assistantMessage);

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
    hasCaughtUp.current = false;
    escalatedApprovalsRef.current.clear();
    approvals.clearApprovals();
    resetChunkTracking();
    resetChunkProcessor();
    apiServiceRef.current?.reset();
    if (subscriptionPromiseRef.current) {
      subscriptionPromiseRef.current.reject(new Error('Chat cleared'));
      subscriptionPromiseRef.current = null;
    }
  }, [messages, approvals, resetChunkTracking, resetChunkProcessor]);

  const resumeDialog = useCallback(
    async (dialogId: string): Promise<boolean> => {
      try {
        setIsLoadingHistory(true);
        setError(null);
        messages.clearMessages();
        setIsTyping(false);
        setNatsStreaming(false);
        approvals.clearApprovals();
        setIsResumedDialog(true);

        const messagesConnection = await dialogGraphQlService.getDialogMessages(dialogId, null);

        if (!messagesConnection || !messagesConnection.edges) {
          throw new Error('Failed to load dialog history');
        }

        const result = processHistoricalMessages(
          messagesConnection.edges.map(edge => edge.node),
          {
            onApprove: approvals.handleApproveRequest,
            onReject: approvals.handleRejectRequest,
            approvalStatuses: approvals.approvalStatuses,
            assistantAvatar: faeAvatar,
            displayApprovalTypes: ['CLIENT'],
          },
        );

        escalatedApprovalsRef.current = result.escalatedApprovals;
        result.messages.forEach((msg: Message) => messages.addMessage(msg));

        setNatsDialogId(dialogId);
        natsDialogIdRef.current = dialogId;

        if (apiServiceRef.current) {
          apiServiceRef.current.setDialogId(dialogId);
        }

        await waitForNatsSubscription(dialogId);

        setIsLoadingHistory(false);
        return true;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to resume dialog');
        setIsLoadingHistory(false);
        setIsResumedDialog(false);
        hasCaughtUp.current = false;
        return false;
      }
    },
    [messages, approvals, waitForNatsSubscription],
  );

  return {
    messages: messages.messages,
    isTyping,
    isStreaming: natsStreaming,
    error,
    dialogId: natsDialogId,
    sendMessage,
    handleQuickAction,
    clearMessages,
    resumeDialog,
    quickActions,
    hasMessages: messages.hasMessages,
    awaitingTechnicianResponse: approvals.awaitingTechnicianResponse,
    isLoadingHistory,
    isResumedDialog,
  };
}
