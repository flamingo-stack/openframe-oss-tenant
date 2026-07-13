'use client';

import { AuthorType, type MessageSegment } from '@flamingo-stack/openframe-frontend-core';
import type { ChatContextItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { findLatestPendingApprovalId } from '@/lib/chat-history';
import { appendImageHash, getFullImageUrl } from '@/lib/image-url';
import { selectUser, useAuthStore } from '@/stores';
import {
  useCreateDialogMutation,
  useSendMessageMutation,
  useStopGenerationMutation,
} from '../services/mingo-api-service';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { CoreMessage } from '../types/message.types';

/** Context attached to an outgoing message: the picker selection plus the
 *  current navigation context (resolved by the caller from the context store).
 *  `openView`/`recentViews` carry the minimal `{ type, id }` wire shape. */
export interface MingoSendContext {
  contextItems?: ChatContextItem[];
  openView?: { type: string; id: string } | null;
  recentViews?: Array<{ type: string; id: string }>;
}

interface ProcessedMessage {
  id: string;
  content: string | MessageSegment[];
  role: 'user' | 'assistant' | 'error';
  name: string;
  /** Entity-context chips for user bubbles (optimistic send only). */
  contextItems?: ChatContextItem[];
  /** Author avatar, resolved to a full/absolute URL (relative `imageUrl`s from
   *  GraphQL/the auth store are prefixed via `getFullImageUrl`). */
  avatar?: string | null;
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
  sendMessage: (content: string, targetDialogId?: string, context?: MingoSendContext) => Promise<boolean>;
  stopGeneration: () => Promise<void>;

  // Approval system
  approvals: MessageSegment[];

  // State
  isCreatingDialog: boolean;
  isTyping: boolean;
  isCompacting: boolean;
  assistantType: 'mingo';
}

/** Structural equality on the rendered `content`. Arrays (segment lists) are
 *  compared by reference first (cheap, hits for unchanged messages) and only
 *  fall back to a stringify when lengths match — strings compare by value. */
function isContentEqual(a: ProcessedMessage['content'], b: ProcessedMessage['content']): boolean {
  if (a === b) return true;
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (!aIsArray || !bIsArray) return false; // both strings, already not === above
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Whether two processed messages render identically — drives reference reuse
 *  so the lib's reference-equality memo can skip unchanged messages. */
function isSameProcessedMessage(a: ProcessedMessage, b: ProcessedMessage): boolean {
  return (
    a.role === b.role &&
    a.name === b.name &&
    a.avatar === b.avatar &&
    a.authorType === b.authorType &&
    a.assistantType === b.assistantType &&
    a.timestamp.getTime() === b.timestamp.getTime() &&
    // Reference equality — contextItems is set once on the optimistic send and
    // never mutated, so a stable reference means the chips are unchanged.
    a.contextItems === b.contextItems &&
    isContentEqual(a.content, b.content)
  );
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

  // Previous render's processed messages, keyed by id, for reference reuse.
  const stableMessagesRef = useRef<Map<string, ProcessedMessage>>(new Map());

  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) {
      stableMessagesRef.current = new Map();
      return [];
    }

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
        const filtered = (msg.content as MessageSegment[]).filter(segment => {
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
        // Reuse the original array reference when nothing was removed, so
        // `content` stays referentially stable for unchanged messages.
        filteredContent = filtered.length === msg.content.length ? msg.content : filtered;
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
        // `msg.avatar` is a relative `imageUrl` (GraphQL owner image or the
        // optimistic auth-store avatar); resolve to a full URL once here so
        // both the standalone page and the embeddable chat get an absolute src.
        avatar: getFullImageUrl(msg.avatar) ?? null,
        assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
        timestamp: msg.timestamp || new Date(),
        contextItems: msg.contextItems,
      });
    }

    // Reference reconciliation: the lib memoizes each rendered message and
    // compares `content` BY REFERENCE, so it only skips re-rendering when the
    // exact same instance is passed again. The mapping above builds fresh
    // objects on every realtime chunk, defeating that memo and forcing the
    // whole list (and every open menu/card inside it) to re-render. Reuse the
    // previous render's object for any message whose processed output is
    // structurally unchanged — comparing the FINAL result (not the source) so
    // the cross-message approval dedup above stays correct.
    const prevStable = stableMessagesRef.current;
    const nextStable = new Map<string, ProcessedMessage>();
    const reconciled = processed.map(msg => {
      const previous = prevStable.get(msg.id);
      const stable = previous && isSameProcessedMessage(previous, msg) ? previous : msg;
      nextStable.set(msg.id, stable);
      return stable;
    });
    stableMessagesRef.current = nextStable;

    return reconciled;
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
      // Surface the failure: callers (quick actions, launcher, draft send) only
      // get a null id back and otherwise bail silently, so without this a dialog
      // that can't be created leaves the user with no feedback.
      toast({
        title: 'Failed to start conversation',
        description: error instanceof Error ? error.message : 'Could not create a new chat',
        variant: 'destructive',
        duration: 5000,
      });
      return null;
    } finally {
      setCreatingDialog(false);
    }
  }, [isCreatingDialog, setCreatingDialog, createDialogMutation, queryClient, toast]);

  const sendMessage = useCallback(
    async (content: string, targetDialogId?: string, context?: MingoSendContext): Promise<boolean> => {
      const effectiveDialogId = targetDialogId || dialogId;
      if (!effectiveDialogId || !content.trim()) return false;
      if (isTyping) {
        // User-typed sends never reach this guard (the composer is disabled
        // while busy) — this catches programmatic senders (launcher prompts,
        // quick actions) that would otherwise vanish with zero feedback.
        toast({
          title: 'Mingo is busy',
          description: 'Wait for the current operation to finish, then try again',
          duration: 4000,
        });
        return false;
      }

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
          // Relative `imageUrl` with cache-bust hash; resolved to a full URL in the processed mapping.
          avatar: appendImageHash(user?.image?.imageUrl, user?.image?.hash) ?? null,
          timestamp: new Date(),
          // Attach the picked context so the optimistic bubble renders its chips.
          contextItems: context?.contextItems?.length ? context.contextItems : undefined,
        };

        addMessage(effectiveDialogId, optimisticMessage);
        await sendMessageMutation.mutateAsync({
          dialogId: effectiveDialogId,
          content: content.trim(),
          // Strip to the `{ type, id }` wire shape; mutation omits empties.
          // Internal `openView` maps to the API's `currentView` field.
          contextItems: context?.contextItems?.map(i => ({ type: i.type, id: i.id })),
          currentView: context?.openView ?? undefined,
          recentViews: context?.recentViews,
        });

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
