'use client';

import {
  type AssistantType,
  type ChatApprovalStatus,
  type Message as ChatMessage,
  extractIncompleteMessageState,
  type MessageSegment,
  type SegmentsUpdateMetadata,
  type TokenUsageData,
  type ToolExecutionSegment,
  useRealtimeChunkProcessor,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useMemo } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { useAuthStore } from '@/stores';
import { type ChatSide, useTicketDetailsStore } from '../stores/ticket-details-store';

function isInProgress(segments: MessageSegment[]): boolean {
  return segments.some(seg => {
    if (seg.type === 'tool_execution' && seg.data.type === 'EXECUTING_TOOL') return true;
    if (seg.type === 'approval_request') return true;
    if (seg.type === 'approval_batch') {
      const allDone =
        !!seg.data.executions &&
        seg.data.toolCalls.every(c => seg.data.executions?.[c.toolExecutionRequestId]?.status === 'done');
      return seg.status !== 'rejected' && !allDone;
    }
    return false;
  });
}

interface UseSideChunkProcessorOptions {
  assistantName: string;
  assistantType: AssistantType;
  userDisplayName?: string;
  isDirectMode?: boolean;
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
  {
    assistantName,
    assistantType,
    userDisplayName,
    isDirectMode,
    onApprove,
    onReject,
    onMetadata,
  }: UseSideChunkProcessorOptions,
) {
  const {
    [side]: sideState,
    addMessage,
    getMessages,
    getStreamingMessage,
    setStreamingMessage,
    setTypingIndicator,
    setTokenUsage,
    updateStreamingMessageSegments,
    appendSegmentsToLastAssistant,
    setAccumulatorCallbacks,
    updateApprovalStatusInMessages,
    updateToolExecutionInMessages,
  } = useTicketDetailsStore();

  const { messages } = sideState;

  const currentUserId = useAuthStore(state => state.user?.id);

  useEffect(() => {
    if (onApprove || onReject) {
      setAccumulatorCallbacks(side, { onApprove, onReject });
    }
  }, [side, onApprove, onReject, setAccumulatorCallbacks]);

  const ensureAssistantMessage = useCallback(() => {
    if (getStreamingMessage(side)) return;

    const last = getMessages(side).at(-1);
    if (last?.role === 'assistant' && Array.isArray(last.content) && isInProgress(last.content)) {
      setStreamingMessage(side, last);
      return;
    }

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
  }, [side, assistantName, assistantType, getMessages, getStreamingMessage, setStreamingMessage, addMessage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: history loads async; need to recompute when `messages` arrives so the accumulator picks up the real initial state.
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
        ensureAssistantMessage();
        setTypingIndicator(side, true);
      },
      onStreamEnd: () => {
        setTypingIndicator(side, false);
        setStreamingMessage(side, null);
      },
      onSegmentsUpdate: (segments: MessageSegment[], metadata?: SegmentsUpdateMetadata) => {
        // Compaction emits must not FORCE the indicator off (the end-emit
        // would unlock the composer until the continuation's first chunk);
        // leave it as-is on compaction, set it on everything else.
        if (!metadata?.isCompacting) setTypingIndicator(side, true);
        if (metadata?.append) {
          appendSegmentsToLastAssistant(side, segments, metadata?.streamSeq);
        } else {
          ensureAssistantMessage();
          updateStreamingMessageSegments(side, segments, metadata?.streamSeq);
        }
      },
      // EXECUTING_TOOL / approved APPROVAL_RESULT chunks land OUTSIDE the
      // message_start/end window (approved commands run between the approval
      // bubble and the continuation stream) — without this the composer
      // unlocks while commands execute. Cleared by onStreamEnd / onError.
      onAgentBusy: () => {
        setTypingIndicator(side, true);
      },
      onError: (error: string) => {
        console.error(`[DialogDetails:${side}] stream error:`, error);
        setTypingIndicator(side, false);
        setStreamingMessage(side, null);
      },
      onTokenUsage: (data: TokenUsageData) => setTokenUsage(side, data),
      onApprovalResolved: (
        requestId: string,
        status: ChatApprovalStatus,
        _approvalType: string,
        resolvedByName?: string | null,
      ) => {
        if (status === 'approved' || status === 'rejected') {
          updateApprovalStatusInMessages('client', requestId, status, resolvedByName);
          updateApprovalStatusInMessages('admin', requestId, status, resolvedByName);
        }
      },
      onToolExecuted: (segment: ToolExecutionSegment) => {
        const execId = segment.data.toolExecutionRequestId;
        if (execId) {
          updateToolExecutionInMessages('client', execId, segment.data);
          updateToolExecutionInMessages('admin', execId, segment.data);
        }
      },
      onUserMessage: (
        text: string,
        meta?: { ownerType?: string; displayName?: string; userId?: string; streamSeq?: number },
      ) => {
        if (meta?.userId && meta.userId === currentUserId) return;

        const isAdminAuthor = meta?.ownerType === 'ADMIN';
        const name = isAdminAuthor ? meta?.displayName : (userDisplayName ?? meta?.displayName);

        addMessage(side, {
          id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          content: text,
          name,
          authorType: isAdminAuthor ? 'admin' : 'user',
          timestamp: new Date(),
          streamSeq: meta?.streamSeq,
        });
      },
      onDirectMessage: (text: string, meta?: { ownerType?: string; displayName?: string; streamSeq?: number }) => {
        const isAdminAuthor = meta?.ownerType === 'ADMIN';
        const name = isAdminAuthor ? meta?.displayName : (userDisplayName ?? meta?.displayName);

        addMessage(side, {
          id: `direct-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          content: text,
          name,
          authorType: isAdminAuthor ? 'admin' : 'user',
          timestamp: new Date(),
          streamSeq: meta?.streamSeq,
        });
      },
      onSystemMessage: (text: string, meta?: { streamSeq?: number }) => {
        addMessage(side, {
          id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          content: '',
          name: text,
          authorType: 'system',
          timestamp: new Date(),
          streamSeq: meta?.streamSeq,
        });
      },
      onMetadata,
      onApprove,
      onReject,
    }),
    [
      side,
      ensureAssistantMessage,
      setTypingIndicator,
      setStreamingMessage,
      updateStreamingMessageSegments,
      appendSegmentsToLastAssistant,
      setTokenUsage,
      addMessage,
      userDisplayName,
      currentUserId,
      onMetadata,
      onApprove,
      onReject,
      updateApprovalStatusInMessages,
      updateToolExecutionInMessages,
    ],
  );

  const approvalStatuses = useTicketDetailsStore(s => s.approvalStatuses);

  const { processChunk } = useRealtimeChunkProcessor({
    callbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    initialState: incompleteState,
    approvalStatuses,
    batchApprovalsEnabled: featureFlags.batchApproval.enabled(),
    isDirectMode,
  });

  return processChunk;
}
