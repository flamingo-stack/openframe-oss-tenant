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

const GENERIC_SEND_ERROR = 'Something went wrong. Please try again.';

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

  const updateLastAssistantMessage = useCallback((segments: MessageSegment[], streamSeq?: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage?.role === 'assistant') {
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content: segments.length > 0 ? segments : '',
          streamSeq: streamSeq != null ? Math.max(lastMessage.streamSeq ?? 0, streamSeq) : lastMessage.streamSeq,
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
        name: assistantName,
        content: [],
        timestamp: new Date(),
        avatar: assistantAvatar,
      };
      return [...prev, assistantMessage];
    });
  }, [assistantName, assistantAvatar]);

  const addErrorMessage = useCallback(() => {
    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      role: 'error',
      name: assistantName ?? 'Fae',
      timestamp: new Date(),
      avatar: assistantAvatar,
      content: [{ type: 'error', title: GENERIC_SEND_ERROR }],
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
  }, [assistantName, assistantAvatar]);

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
    (segments: MessageSegment[], streamSeq?: number) => {
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
              // Mirror the lib's upsertTrailingCompaction: replace the LAST
              // 'started' (earlier compactions in the bubble are already
              // completed-in-place), else append. The previous first-match +
              // any-compaction blanket silently dropped a second compaction
              // landing in the same bubble.
              let startedIdx = -1;
              for (let k = existing.length - 1; k >= 0; k--) {
                const s = existing[k];
                if (s.type === 'context_compaction' && s.status === 'started') {
                  startedIdx = k;
                  break;
                }
              }

              if (startedIdx !== -1) {
                nextContent = [...existing];
                nextContent[startedIdx] = incomingCompaction;
              } else {
                nextContent = [...existing, incomingCompaction];
              }
            } else {
              nextContent = segmentAccumulator.replaySegments([...existing, ...segments]);
            }

            newMessages[i] = {
              ...newMessages[i],
              content: nextContent,
              streamSeq:
                streamSeq != null ? Math.max(newMessages[i].streamSeq ?? 0, streamSeq) : newMessages[i].streamSeq,
            };
            return newMessages;
          }
        }
        // No assistant message in live state (resumed dialog — history is
        // owned by React Query, the live array starts empty): open a fresh
        // bubble instead of dropping the segments — mirrors the lib's
        // appendToTrailingAssistant.
        return [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            name: assistantName,
            content: incomingCompaction ? [incomingCompaction] : [...segments],
            timestamp: new Date(),
            avatar: assistantAvatar,
            ...(streamSeq != null ? { streamSeq } : {}),
          } satisfies Message,
        ];
      });
    },
    [segmentAccumulator, assistantName, assistantAvatar],
  );

  const updateSegments = useCallback(
    (segments: MessageSegment[], streamSeq?: number) => {
      const processed = segmentAccumulator.replaySegments(segments);
      updateLastAssistantMessage(processed, streamSeq);
    },
    [segmentAccumulator, updateLastAssistantMessage],
  );

  // Cross-message status updater: find approval_request/approval_batch with
  // matching requestId across the dialog and flip its status in place. Used
  // when APPROVAL_RESULT arrives after the originating message has ended
  // (e.g. interrupt-cancel) — the cross-message handler keeps the resolved
  // status on the original card without spawning a duplicate bubble.
  // `resolvedByName` (from the APPROVAL_RESULT chunk) feeds the status pill
  // ("Approved by {name}").
  const updateApprovalStatusById = useCallback(
    (requestId: string, status: 'approved' | 'rejected', resolvedByName?: string | null) => {
      setMessages(prev =>
        prev.map(message => {
          if (message.role !== 'assistant' || !Array.isArray(message.content)) return message;
          const updatedContent = (message.content as MessageSegment[]).map(segment => {
            if (segment.type === 'approval_request' && segment.data?.requestId === requestId) {
              return { ...segment, status, resolvedByName: resolvedByName ?? segment.resolvedByName };
            }
            if (segment.type === 'approval_batch' && segment.data?.approvalRequestId === requestId) {
              return {
                ...segment,
                status,
                resolvedByName: resolvedByName ?? segment.resolvedByName,
              } as ApprovalBatchSegment;
            }
            return segment;
          });
          return { ...message, content: updatedContent };
        }),
      );
    },
    [],
  );

  // Cross-message tool execution updater: merges EXECUTING_TOOL/EXECUTED_TOOL
  // results into the originating standalone segment OR the matching batch's
  // `executions[execId]` slot in an earlier message. First-match wins.
  //
  // `executionRequestId` is optional: legacy backends omit it, in which case
  // an EXECUTED chunk pairs with the newest EXECUTING segment of the same
  // (integratedToolType, toolFunction). When NOTHING matches — the common
  // case for the FIRST post-MESSAGE_END EXECUTING chunk of an approved
  // single command, which has no prior segment to merge into — the segment
  // is APPENDED to the last assistant bubble instead of being dropped, so
  // the tool run is visible at all.
  const updateToolExecutionById = useCallback(
    (executionRequestId: string | undefined, executedData: ToolExecutionSegment['data']) => {
      setMessages(prev => {
        // Scan NEWEST-first: an id-less EXECUTED must pair with the newest
        // in-flight EXECUTING of the same tool (a stale interrupted card from
        // an earlier turn must not swallow the current run); execId matches
        // are unique so direction doesn't change them.
        let msgIdx = -1;
        let segIdx = -1;
        for (let i = prev.length - 1; i >= 0 && msgIdx === -1; i--) {
          const message = prev[i];
          if (message.role !== 'assistant' || !Array.isArray(message.content)) continue;
          const content = message.content as MessageSegment[];
          for (let j = content.length - 1; j >= 0; j--) {
            const segment = content[j];
            if (segment.type === 'tool_execution') {
              const idMatches = executionRequestId
                ? segment.data.toolExecutionRequestId === executionRequestId
                : segment.data.type === 'EXECUTING_TOOL' &&
                  segment.data.integratedToolType === executedData.integratedToolType &&
                  segment.data.toolFunction === executedData.toolFunction;
              if (idMatches) {
                msgIdx = i;
                segIdx = j;
                break;
              }
            } else if (
              executionRequestId &&
              segment.type === 'approval_batch' &&
              segment.data.toolCalls.some(c => c.toolExecutionRequestId === executionRequestId)
            ) {
              msgIdx = i;
              segIdx = j;
              break;
            }
          }
        }

        if (msgIdx !== -1) {
          const message = prev[msgIdx];
          const content = message.content as MessageSegment[];
          const segment = content[segIdx];
          let nextSegment: MessageSegment;

          if (segment.type === 'tool_execution') {
            // Never downgrade a completed run back to EXECUTING (JetStream
            // redelivery of the EXECUTING chunk after EXECUTED landed).
            // Returning here (a match, no change) also skips the append
            // fallback below — the run is already represented on screen, so
            // appending would duplicate the card.
            if (executedData.type === 'EXECUTING_TOOL' && segment.data.type === 'EXECUTED_TOOL') {
              return prev;
            }
            nextSegment = {
              type: 'tool_execution',
              data: {
                ...executedData,
                toolTitle: executedData.toolTitle ?? segment.data.toolTitle,
                parameters: executedData.parameters ?? segment.data.parameters,
              },
            } satisfies ToolExecutionSegment;
          } else {
            const batch = segment as ApprovalBatchSegment;
            const prevExec: ApprovalBatchExecutionState | undefined =
              batch.data.executions?.[executionRequestId as string];
            // Same no-downgrade rule for a batch slot: a redelivered EXECUTING
            // must not flip a 'done' entry back (match found → no append below).
            if (executedData.type === 'EXECUTING_TOOL' && prevExec?.status === 'done') {
              return prev;
            }
            const nextExec: ApprovalBatchExecutionState =
              executedData.type === 'EXECUTED_TOOL'
                ? { status: 'done', result: executedData.result, success: executedData.success }
                : { status: 'executing', result: prevExec?.result, success: prevExec?.success };
            nextSegment = {
              ...batch,
              data: {
                ...batch.data,
                executions: { ...(batch.data.executions ?? {}), [executionRequestId as string]: nextExec },
              },
            } as ApprovalBatchSegment;
          }

          const nextContent = [...content];
          nextContent[segIdx] = nextSegment;
          const next = [...prev];
          next[msgIdx] = { ...message, content: nextContent };
          return next;
        }

        // No match anywhere — append the segment to the last assistant bubble.
        for (let i = prev.length - 1; i >= 0; i--) {
          const message = prev[i];
          if (message.role !== 'assistant') continue;
          const existing = Array.isArray(message.content) ? (message.content as MessageSegment[]) : [];
          const appended = [...prev];
          appended[i] = {
            ...message,
            content: [...existing, { type: 'tool_execution', data: executedData } satisfies ToolExecutionSegment],
          };
          return appended;
        }
        // No assistant message in live state at all (resumed dialog: history
        // is owned by React Query, the live array starts empty — approving a
        // command from a historical bubble lands its EXECUTING chunk here).
        // Open a fresh bubble instead of dropping it, or the tool run is
        // invisible — the exact bug this updater's fallback exists to fix.
        return [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            name: assistantName,
            content: [{ type: 'tool_execution', data: executedData } satisfies ToolExecutionSegment],
            timestamp: new Date(),
            avatar: assistantAvatar,
          } satisfies Message,
        ];
      });
    },
    [assistantName, assistantAvatar],
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
