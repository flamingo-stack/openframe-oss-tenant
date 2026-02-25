'use client';

import { type MessageSegment } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useCreateDialogMutation, useSendMessageMutation } from '../services/mingo-api-service';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { CoreMessage } from '../types/message.types';

interface ProcessedMessage {
  id: string;
  content: string | MessageSegment[];
  role: 'user' | 'assistant' | 'error';
  name: string;
  assistantType?: 'fae' | 'mingo';
  timestamp: Date;
}

interface UseMingoChat {
  // Messages
  messages: ProcessedMessage[];
  isLoading: boolean;

  // Actions
  createDialog: () => Promise<string | null>;
  sendMessage: (content: string, targetDialogId?: string) => Promise<boolean>;

  // Approval system
  approvals: MessageSegment[];

  // State
  isCreatingDialog: boolean;
  isTyping: boolean;
  assistantType: 'mingo';
}

export function useMingoChat(dialogId: string | null): UseMingoChat {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    messagesByDialog,
    addMessage,
    typingStates,
    setTyping,
    removeWelcomeMessages,
    isCreatingDialog,
    setCreatingDialog,
  } = useMingoMessagesStore();

  const isTyping = useMemo(() => {
    if (!dialogId) return false;
    return typingStates.get(dialogId) || false;
  }, [dialogId, typingStates]);

  const createDialogMutation = useCreateDialogMutation();
  const sendMessageMutation = useSendMessageMutation();

  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) return [];

    const currentMessages = messagesByDialog.get(dialogId) || [];
    const filteredMessages = currentMessages.filter(msg => !msg.id.startsWith('pending-approvals-'));

    return filteredMessages.map(msg => {
      let filteredContent = msg.content;

      if (Array.isArray(msg.content)) {
        filteredContent = (msg.content as MessageSegment[]).filter(
          segment => !(segment.type === 'approval_request' && segment.status === 'pending'),
        );
      }

      return {
        id: msg.id,
        content: filteredContent,
        role: msg.role,
        name: msg.name || 'Unknown',
        assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
        timestamp: msg.timestamp || new Date(),
      };
    });
  }, [dialogId, messagesByDialog]);

  // Extract pending approvals from messages
  const approvals = useMemo(() => {
    if (!dialogId) return [];

    const currentMessages = messagesByDialog.get(dialogId) || [];
    const pendingApprovalSegments: MessageSegment[] = [];

    currentMessages.forEach(msg => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach(segment => {
          if (segment.type === 'approval_request' && segment.status === 'pending') {
            pendingApprovalSegments.push(segment as MessageSegment);
          }
        });
      }
    });

    return pendingApprovalSegments;
  }, [dialogId, messagesByDialog]);

  const createDialog = useCallback(async (): Promise<string | null> => {
    if (isCreatingDialog) return null;

    try {
      setCreatingDialog(true);

      const result = await createDialogMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['mingo-dialogs'] });

      return result.id;
    } catch (error) {
      console.error('[MingoChat] Failed to create dialog:', error);
      return null;
    } finally {
      setCreatingDialog(false);
    }
  }, [isCreatingDialog, setCreatingDialog, createDialogMutation, queryClient]);

  const sendMessage = useCallback(
    async (content: string, targetDialogId?: string): Promise<boolean> => {
      const effectiveDialogId = targetDialogId || dialogId;
      if (!effectiveDialogId || !content.trim()) return false;
      if (isTyping) return false;

      try {
        setTyping(effectiveDialogId, true);
        removeWelcomeMessages(effectiveDialogId);

        const optimisticMessage: CoreMessage = {
          id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          content: content.trim(),
          name: 'You',
          timestamp: new Date(),
        };

        addMessage(effectiveDialogId, optimisticMessage);
        await sendMessageMutation.mutateAsync({ dialogId: effectiveDialogId, content: content.trim() });

        return true;
      } catch (error) {
        console.error('[MingoChat] Failed to send message:', error);

        setTyping(effectiveDialogId, false);

        toast({
          title: 'Send Failed',
          description: error instanceof Error ? error.message : 'Failed to send message',
          variant: 'destructive',
          duration: 5000,
        });

        return false;
      }
    },
    [dialogId, isTyping, setTyping, removeWelcomeMessages, addMessage, sendMessageMutation, toast],
  );

  return {
    // Messages
    messages,
    isLoading: false,

    // Actions
    createDialog,
    sendMessage,

    // Approval system
    approvals,

    // State
    isCreatingDialog,
    isTyping,
    assistantType: 'mingo' as const,
  };
}
