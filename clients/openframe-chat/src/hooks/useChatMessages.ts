import {
  type ApprovalBatchExecutionState,
  type ApprovalBatchSegment,
  createMessageSegmentAccumulator,
  type Message,
  type MessageSegment,
  type ToolExecutionSegment,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useRef, useState } from 'react';
import { useAssistantBranding } from './useAssistantBranding';

interface UseChatMessagesOptions {
  onApprove?: (requestId?: string) => Promise<void> | void;
  onReject?: (requestId?: string) => Promise<void> | void;
}

export function useChatMessages({ onApprove, onReject }: UseChatMessagesOptions = {}) {
  const { assistantName, assistantAvatar } = useAssistantBranding();
  const [messages, setMessages] = useState<Message[]>([]);
  const segmentAccumulator = useRef(createMessageSegmentAccumulator({ onApprove, onReject })).current;

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastAssistantMessage = useCallback((segments: MessageSegment[]) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage?.role === 'assistant') {
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content: segments.length > 0 ? segments : '',
        };
      }
      return newMessages;
    });
  }, []);

  const ensureAssistantMessage = useCallback(() => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') return prev;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        name: assistantName ?? 'Fae',
        content: [],
        timestamp: new Date(),
        avatar: assistantAvatar,
      };
      return [...prev, assistantMessage];
    });
  }, [assistantName, assistantAvatar]);

  const addErrorMessage = useCallback(
    (errorText: string) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'error',
        name: assistantName ?? 'Fae',
        timestamp: new Date(),
        avatar: assistantAvatar,
        content: errorText,
      };

      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (
          lastMessage?.role === 'assistant' &&
          (lastMessage.content === '' || (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))
        ) {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
    },
    [assistantName, assistantAvatar],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    segmentAccumulator.reset();
  }, [segmentAccumulator]);

  const appendTextToCurrentMessage = useCallback(
    (text: string) => {
      const segments = segmentAccumulator.appendText(text);
      updateLastAssistantMessage(segments);
    },
    [segmentAccumulator, updateLastAssistantMessage],
  );

  const addToolSegmentToCurrentMessage = useCallback(
    (segment: MessageSegment) => {
      if (segment.type === 'tool_execution') {
        const segments = segmentAccumulator.addToolExecution(segment);
        updateLastAssistantMessage(segments);
      }
    },
    [segmentAccumulator, updateLastAssistantMessage],
  );

  const resetCurrentMessageSegments = useCallback(() => {
    segmentAccumulator.resetSegments();
  }, [segmentAccumulator]);

  const appendSegmentsToLastAssistant = useCallback(
    (segments: MessageSegment[]) => {
      const incomingCompaction = [...segments]
        .reverse()
        .find((s): s is Extract<MessageSegment, { type: 'context_compaction' }> => s.type === 'context_compaction');

      setMessages(prev => {
        const newMessages = [...prev];
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'assistant') {
            const existing = Array.isArray(newMessages[i].content) ? (newMessages[i].content as MessageSegment[]) : [];

            let nextContent: MessageSegment[];

            if (incomingCompaction) {
              const startedIdx = existing.findIndex(s => s.type === 'context_compaction' && s.status === 'started');
              const hasAnyCompaction = existing.some(s => s.type === 'context_compaction');

              if (incomingCompaction.status === 'completed' && startedIdx !== -1) {
                nextContent = [...existing];
                nextContent[startedIdx] = incomingCompaction;
              } else if (!hasAnyCompaction) {
                nextContent = [...existing, incomingCompaction];
              } else {
                nextContent = existing;
              }
            } else {
              nextContent = segmentAccumulator.replaySegments([...existing, ...segments]);
            }

            newMessages[i] = { ...newMessages[i], content: nextContent };
            return newMessages;
          }
        }
        return prev;
      });
    },
    [segmentAccumulator],
  );

  const updateSegments = useCallback(
    (segments: MessageSegment[]) => {
      const processed = segmentAccumulator.replaySegments(segments);
      updateLastAssistantMessage(processed);
    },
    [segmentAccumulator, updateLastAssistantMessage],
  );

  // Cross-message status updater: find approval_request/approval_batch with
  // matching requestId across the dialog and flip its status in place. Used
  // when APPROVAL_RESULT arrives after the originating message has ended
  // (e.g. interrupt-cancel) — the cross-message handler keeps the resolved
  // status on the original card without spawning a duplicate bubble.
  const updateApprovalStatusById = useCallback((requestId: string, status: 'approved' | 'rejected') => {
    setMessages(prev =>
      prev.map(message => {
        if (message.role !== 'assistant' || !Array.isArray(message.content)) return message;
        const updatedContent = (message.content as MessageSegment[]).map(segment => {
          if (segment.type === 'approval_request' && segment.data?.requestId === requestId) {
            return { ...segment, status };
          }
          if (segment.type === 'approval_batch' && segment.data?.approvalRequestId === requestId) {
            return { ...segment, status } as ApprovalBatchSegment;
          }
          return segment;
        });
        return { ...message, content: updatedContent };
      }),
    );
  }, []);

  // Cross-message tool execution updater: merges EXECUTING_TOOL/EXECUTED_TOOL
  // results into the originating standalone segment OR the matching batch's
  // `executions[execId]` slot in an earlier message. First-match wins.
  const updateToolExecutionById = useCallback(
    (executionRequestId: string, executedData: ToolExecutionSegment['data']) => {
      setMessages(prev => {
        let matched = false;
        const next = prev.map(message => {
          if (matched) return message;
          if (message.role !== 'assistant' || !Array.isArray(message.content)) return message;

          let changed = false;
          const updatedContent = (message.content as MessageSegment[]).map(segment => {
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
              const prevExec: ApprovalBatchExecutionState | undefined = segment.data.executions?.[executionRequestId];
              const nextExec: ApprovalBatchExecutionState =
                executedData.type === 'EXECUTED_TOOL'
                  ? { status: 'done', result: executedData.result, success: executedData.success }
                  : { status: 'executing', result: prevExec?.result, success: prevExec?.success };
              return {
                ...segment,
                data: {
                  ...segment.data,
                  executions: { ...(segment.data.executions ?? {}), [executionRequestId]: nextExec },
                },
              } as ApprovalBatchSegment;
            }

            return segment;
          });

          return changed ? { ...message, content: updatedContent } : message;
        });
        return matched ? next : prev;
      });
    },
    [],
  );

  return {
    messages,
    hasMessages: messages.length > 0,
    addMessage,
    updateLastAssistantMessage,
    ensureAssistantMessage,
    appendSegmentsToLastAssistant,
    addErrorMessage,
    clearMessages,
    appendTextToCurrentMessage,
    addToolSegmentToCurrentMessage,
    resetCurrentMessageSegments,
    updateSegments,
    updateApprovalStatusById,
    updateToolExecutionById,
    segmentAccumulator,
  };
}
