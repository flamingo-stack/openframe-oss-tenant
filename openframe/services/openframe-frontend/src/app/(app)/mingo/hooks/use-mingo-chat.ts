'use client';

import { AuthorType, type MessageSegment } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { findLatestPendingApprovalId } from '@/lib/chat-history';
import { selectUser, useAuthStore } from '@/stores';
import {
  useCreateDialogMutation,
  useSendMessageMutation,
  useStopGenerationMutation,
} from '../services/mingo-api-service';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { CoreMessage } from '../types/message.types';

interface ProcessedMessage {
  id: string;
  content: string | MessageSegment[];
  role: 'user' | 'assistant' | 'error';
  name: string;
  authorType?: AuthorType;
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
  stopGeneration: () => Promise<void>;

  // Approval system
  approvals: MessageSegment[];

  // State
  isCreatingDialog: boolean;
  isTyping: boolean;
  isCompacting: boolean;
  assistantType: 'mingo';
}

export function useMingoChat(dialogId: string | null): UseMingoChat {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore(selectUser);

  const {
    messagesByDialog,
    addMessage,
    typingStates,
    setTyping,
    removeWelcomeMessages,
    updateApprovalStatusInMessages,
    isCreatingDialog,
    setCreatingDialog,
  } = useMingoMessagesStore();

  const isTyping = useMemo(() => {
    if (!dialogId) return false;
    return typingStates.get(dialogId) || false;
  }, [dialogId, typingStates]);

  const createDialogMutation = useCreateDialogMutation();
  const sendMessageMutation = useSendMessageMutation();
  const stopGenerationMutation = useStopGenerationMutation();

  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) return [];

    const currentMessages = messagesByDialog.get(dialogId) || [];
    // Dedupe approval cards across bubbles: the agent re-asks for the same
    // approval (same requestId) when the user interrupts. After MESSAGE_START
    // resets the accumulator, the retry pushes a fresh segment into a new
    // bubble, and the cross-message status updater flips *every* matching
    // segment — so a single rejected approval would render twice. First
    // occurrence wins; later duplicates are hidden.
    const seenApprovalIds = new Set<string>();
    const processed: ProcessedMessage[] = [];

    for (const msg of currentMessages) {
      let filteredContent = msg.content;

      if (Array.isArray(msg.content)) {
        filteredContent = (msg.content as MessageSegment[]).filter(segment => {
          if (segment.type === 'approval_request' && segment.status === 'pending') return false;

          if (segment.type === 'approval_request') {
            const id = segment.data?.requestId;
            if (id) {
              if (seenApprovalIds.has(id)) return false;
              seenApprovalIds.add(id);
            }
          } else if (segment.type === 'approval_batch') {
            const id = segment.data?.approvalRequestId;
            if (id) {
              if (seenApprovalIds.has(id)) return false;
              seenApprovalIds.add(id);
            }
          }

          return true;
        });
      }

      // Skip assistant bubbles that are empty after filtering (only held
      // pending/duplicate approval segments). User and error messages render
      // even when content is empty — that's their own concern.
      if (msg.role === 'assistant' && Array.isArray(filteredContent) && filteredContent.length === 0) {
        continue;
      }

      processed.push({
        id: msg.id,
        content: filteredContent,
        role: msg.role,
        authorType: msg.authorType,
        name: msg.name || 'Unknown',
        assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
        timestamp: msg.timestamp || new Date(),
      });
    }

    return processed;
  }, [dialogId, messagesByDialog]);

  // Extract pending approvals from messages, deduplicated by requestId
  const approvals = useMemo(() => {
    if (!dialogId) return [];

    const currentMessages = messagesByDialog.get(dialogId) || [];
    const seenRequestIds = new Set<string>();
    const pendingApprovalSegments: MessageSegment[] = [];

    currentMessages.forEach(msg => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach(segment => {
          if (segment.type === 'approval_request' && segment.status === 'pending') {
            const requestId = segment.data?.requestId;
            if (requestId && seenRequestIds.has(requestId)) return;
            if (requestId) seenRequestIds.add(requestId);
            pendingApprovalSegments.push(segment as MessageSegment);
          }
        });
      }
    });

    return pendingApprovalSegments;
  }, [dialogId, messagesByDialog]);

  const isCompacting = useMemo(() => {
    if (!dialogId) return false;
    const lastMsg = messagesByDialog.get(dialogId)?.at(-1);
    if (lastMsg?.role !== 'assistant' || !Array.isArray(lastMsg.content)) return false;
    const tail = lastMsg.content.at(-1);
    return tail?.type === 'context_compaction' && tail.status === 'started';
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

        // Sending while an approval pends is an interrupt — backend will
        // cancel it and emit APPROVAL_RESULT (rejected) shortly. Flip the
        // latest pending one now so the card resolves in the same frame as
        // the user-message bubble (no layout jump between the two updates).
        const pendingId = findLatestPendingApprovalId(messagesByDialog.get(effectiveDialogId) || []);
        if (pendingId) {
          updateApprovalStatusInMessages(effectiveDialogId, pendingId, 'rejected');
        }

        const optimisticMessage: CoreMessage = {
          id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'user',
          authorType: 'admin',
          content: content.trim(),
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin',
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
    [
      dialogId,
      isTyping,
      setTyping,
      removeWelcomeMessages,
      addMessage,
      messagesByDialog,
      updateApprovalStatusInMessages,
      sendMessageMutation,
      toast,
      user,
    ],
  );

  const stopGeneration = useCallback(async () => {
    if (!dialogId) return;

    try {
      await stopGenerationMutation.mutateAsync(dialogId);
      setTyping(dialogId, false);
    } catch (error) {
      console.error('[MingoChat] Failed to stop generation:', error);
      toast({
        title: 'Stop Failed',
        description: error instanceof Error ? error.message : 'Failed to stop generation',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [dialogId, stopGenerationMutation, setTyping, toast]);

  return {
    // Messages
    messages,
    isLoading: false,

    // Actions
    createDialog,
    sendMessage,
    stopGeneration,

    // Approval system
    approvals,

    // State
    isCreatingDialog,
    isTyping,
    isCompacting,
    assistantType: 'mingo' as const,
  };
}
