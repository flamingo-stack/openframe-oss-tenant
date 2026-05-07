import {
  createMessageSegmentAccumulator,
  type Message,
  type MessageSegment,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useRef, useState } from 'react';
import faeAvatar from '../assets/fae-avatar.png';

interface UseChatMessagesOptions {
  onApprove?: (requestId?: string) => Promise<void> | void;
  onReject?: (requestId?: string) => Promise<void> | void;
}

export function useChatMessages({ onApprove, onReject }: UseChatMessagesOptions = {}) {
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
        name: 'Fae',
        content: [],
        timestamp: new Date(),
        avatar: faeAvatar,
      };
      return [...prev, assistantMessage];
    });
  }, []);

  const addErrorMessage = useCallback((errorText: string) => {
    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      role: 'error',
      name: 'Fae',
      timestamp: new Date(),
      avatar: faeAvatar,
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
  }, []);

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
    segmentAccumulator,
  };
}
