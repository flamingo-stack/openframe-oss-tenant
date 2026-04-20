'use client';

import {
  type AssistantType,
  type Message as ChatMessage,
  extractIncompleteMessageState,
  type MessageSegment,
  parseChunkToAction,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo } from 'react';
import { type ApprovalStatus, type ChatSide, useDialogDetailsStore } from '../stores/dialog-details-store';

interface UseSideChunkProcessorOptions {
  assistantName: string;
  assistantType: AssistantType;
  userDisplayName?: string;
  onApprove?: (requestId?: string) => void | Promise<void>;
  onReject?: (requestId?: string) => void | Promise<void>;
  onMetadata?: (metadata: {
    modelDisplayName: string;
    modelName: string;
    providerName: string;
    contextWindow: number;
  }) => void;
}

/**
 * Drives one chat side (client or admin) of a dialog from NATS chunks.
 */
export function useSideChunkProcessor(
  side: ChatSide,
  { assistantName, assistantType, userDisplayName, onApprove, onReject, onMetadata }: UseSideChunkProcessorOptions,
) {
  const {
    [side]: sideState,
    addMessage,
    getStreamingMessage,
    setStreamingMessage,
    setTypingIndicator,
    setCompactingIndicator,
    setTokenUsage,
    updateStreamingMessageSegments,
    appendSegmentsToLastAssistant,
    setAccumulatorCallbacks,
    updateApprovalStatusInMessages,
  } = useDialogDetailsStore();

  const { messages } = sideState;

  useEffect(() => {
    if (onApprove || onReject) {
      setAccumulatorCallbacks(side, { onApprove, onReject });
    }
  }, [side, onApprove, onReject, setAccumulatorCallbacks]);

  const ensureAssistantMessage = useCallback(() => {
    if (getStreamingMessage(side)) return;

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: 'assistant',
      content: [],
      name: assistantName,
      assistantType,
      timestamp: new Date(),
    };

    setStreamingMessage(side, assistantMessage);
    addMessage(side, assistantMessage);
  }, [side, assistantName, assistantType, getStreamingMessage, setStreamingMessage, addMessage]);

  const incompleteState = useMemo(() => {
    const tail: MessageSegment[] = [];
    let lastAssistantId = '';
    let lastAssistantTimestamp = new Date();

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'assistant') break;
      if (!lastAssistantId) {
        lastAssistantId = msg.id;
        lastAssistantTimestamp = msg.timestamp || new Date();
      }
      if (Array.isArray(msg.content)) {
        tail.unshift(...msg.content);
      } else if (typeof msg.content === 'string' && msg.content) {
        tail.unshift({ type: 'text', text: msg.content } as MessageSegment);
      }
    }

    if (!tail.length || !lastAssistantId) return undefined;

    return extractIncompleteMessageState({
      id: lastAssistantId,
      role: 'assistant',
      content: tail,
      name: assistantName,
      assistantType,
      timestamp: lastAssistantTimestamp,
    });
  }, [messages, assistantName, assistantType]);

  const callbacks = useMemo(
    () => ({
      onStreamStart: () => {
        setCompactingIndicator(side, false);
        ensureAssistantMessage();
        setTypingIndicator(side, true);
      },
      onStreamEnd: () => {
        setTypingIndicator(side, false);
        setStreamingMessage(side, null);
      },
      onSegmentsUpdate: (segments: MessageSegment[], metadata?: SegmentsUpdateMetadata) => {
        if (metadata?.isCompacting) {
          const lastCompaction = [...segments]
            .reverse()
            .find((s): s is Extract<MessageSegment, { type: 'context_compaction' }> => s.type === 'context_compaction');
          setCompactingIndicator(side, lastCompaction?.status === 'started');
          setTypingIndicator(side, false);
        } else {
          setCompactingIndicator(side, false);
          setTypingIndicator(side, true);
        }

        if (metadata?.append) {
          appendSegmentsToLastAssistant(side, segments);
        } else {
          ensureAssistantMessage();
          updateStreamingMessageSegments(side, segments);
        }
      },
      onError: (error: string) => {
        console.error(`[DialogDetails:${side}] stream error:`, error);
        setTypingIndicator(side, false);
        setStreamingMessage(side, null);
      },
      onTokenUsage: (data: TokenUsageData) => setTokenUsage(side, data),
      onUserMessage: (text: string, meta?: { ownerType?: string; displayName?: string }) => {
        if (side === 'admin' && meta?.ownerType === 'ADMIN') return;

        const isAdminAuthor = meta?.ownerType === 'ADMIN';
        const name = isAdminAuthor ? meta?.displayName : (userDisplayName ?? meta?.displayName);

        addMessage(side, {
          id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          content: text,
          name,
          authorType: isAdminAuthor ? 'admin' : 'user',
          timestamp: new Date(),
        });
      },
      onMetadata,
      onApprove,
      onReject,
    }),
    [
      side,
      ensureAssistantMessage,
      setCompactingIndicator,
      setTypingIndicator,
      setStreamingMessage,
      updateStreamingMessageSegments,
      appendSegmentsToLastAssistant,
      setTokenUsage,
      addMessage,
      userDisplayName,
      onMetadata,
      onApprove,
      onReject,
    ],
  );

  const approvalStatuses = useDialogDetailsStore(s => s.approvalStatuses);

  const { processChunk: coreProcessChunk, updateApprovalStatus: coreUpdateApprovalStatus } = useRealtimeChunkProcessor({
    callbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    initialState: incompleteState,
    approvalStatuses,
  });

  return useCallback(
    (chunk: unknown) => {
      const action = parseChunkToAction(chunk);
      if (action?.action === 'approval_result' && action.requestId) {
        const status: ApprovalStatus = action.approved ? 'approved' : 'rejected';
        coreUpdateApprovalStatus(action.requestId, status);
        updateApprovalStatusInMessages('client', action.requestId, status);
        updateApprovalStatusInMessages('admin', action.requestId, status);
        return;
      }
      coreProcessChunk(chunk);
    },
    [coreProcessChunk, coreUpdateApprovalStatus, updateApprovalStatusInMessages],
  );
}
