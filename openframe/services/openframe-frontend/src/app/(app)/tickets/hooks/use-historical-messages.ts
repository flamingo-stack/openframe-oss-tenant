'use client';

import {
  type AssistantType,
  type Message as ChatMessage,
  computeHistoryPrepend,
  flattenMessagePagesChronological,
  type HistoricalMessage,
  type MessageSegment,
  maxPersistedStreamSeq,
  mergeHistoryWithRealtime,
  processHistoricalMessagesWithErrors,
} from '@flamingo-stack/openframe-frontend-core';
import { useEffect, useRef } from 'react';
import { foldPendingApprovalsEnvelope } from '@/lib/chat-history';
import { featureFlags } from '@/lib/feature-flags';
import type { ChatType } from '../constants';
import type { MessagePage } from '../services/ticket-service.types';
import { type ChatSide, useTicketDetailsStore } from '../stores/ticket-details-store';

interface UseHistoricalMessageSyncOptions {
  side: ChatSide;
  messageDialogId: string | null;
  chatType: ChatType;
  assistantConfig: { name: string; type: AssistantType };
  pages: MessagePage[] | undefined;
  /** react-query `dataUpdatedAt` of the pages — the freshness boundary the
   *  merge uses to decide which realtime synthetics history can replace. */
  dataUpdatedAt: number;
  isFetched: boolean;
  onApprove: (requestId?: string) => void | Promise<void>;
  onReject: (requestId?: string) => void | Promise<void>;
}

/**
 * Runs `processHistoricalMessagesWithErrors` against each newly-fetched page of
 * ticket messages and feeds the result into the ticket-details-store.
 */
export function useHistoricalMessages({
  side,
  messageDialogId,
  chatType,
  assistantConfig,
  pages,
  dataUpdatedAt,
  isFetched,
  onApprove,
  onReject,
}: UseHistoricalMessageSyncOptions) {
  const getMessages = useTicketDetailsStore(s => s.getMessages);
  const setMessages = useTicketDetailsStore(s => s.setMessages);
  // Reactive (not the getter): the merge must RE-RUN when the stream ends —
  // that's the moment the exempted streaming synthetic becomes droppable
  // against already-fetched history, and nothing else re-triggers the effect.
  const streamingMessageId = useTicketDetailsStore(s => s[side].streaming?.id ?? null);
  const prependWithBoundaryMerge = useTicketDetailsStore(s => s.prependWithBoundaryMerge);
  const approvalStatuses = useTicketDetailsStore(s => s.approvalStatuses);
  const mergeApprovalStatuses = useTicketDetailsStore(s => s.mergeApprovalStatuses);
  const getHighestStreamSeq = useTicketDetailsStore(s => s.getHighestStreamSeq);

  const approvalStatusesRef = useRef(approvalStatuses);
  approvalStatusesRef.current = approvalStatuses;

  const onApproveRef = useRef(onApprove);
  const onRejectRef = useRef(onReject);
  onApproveRef.current = onApprove;
  onRejectRef.current = onReject;

  const processedPageCountRef = useRef(0);
  const prevDialogIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pages || !messageDialogId || !isFetched) return;

    if (prevDialogIdRef.current !== messageDialogId) {
      processedPageCountRef.current = 0;
      prevDialogIdRef.current = messageDialogId;
    }

    const flatMessages = flattenMessagePagesChronological(pages);

    // The server filters by chatType; `chatTypeFilter` below is the defensive layer.
    const historical: HistoricalMessage[] = flatMessages.map(msg => ({
      id: msg.id,
      dialogId: msg.dialogId,
      chatType: msg.chatType,
      createdAt: msg.createdAt,
      owner: msg.owner,
      messageData: msg.messageData,
    }));

    const historicalResolutions: Record<string, 'approved' | 'rejected'> = {};
    for (const msg of historical) {
      const dataArray = Array.isArray(msg.messageData) ? msg.messageData : msg.messageData ? [msg.messageData] : [];
      for (const data of dataArray) {
        const d = data as { type?: string; approvalRequestId?: string; approved?: boolean };
        if (d?.type === 'APPROVAL_RESULT' && typeof d.approvalRequestId === 'string' && d.approvalRequestId) {
          historicalResolutions[d.approvalRequestId] = d.approved ? 'approved' : 'rejected';
        }
      }
    }
    if (Object.keys(historicalResolutions).length > 0) {
      mergeApprovalStatuses(historicalResolutions);
    }

    const { messages: processed } = processHistoricalMessagesWithErrors(historical, {
      assistantName: assistantConfig.name,
      assistantType: assistantConfig.type,
      chatTypeFilter: chatType,
      onApprove: onApproveRef.current,
      onReject: onRejectRef.current,
      approvalStatuses: { ...approvalStatusesRef.current, ...historicalResolutions },
      batchApprovalsEnabled: featureFlags.batchApproval.enabled(),
    });

    const storeMessages: ChatMessage[] = foldPendingApprovalsEnvelope(
      processed.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content as string | MessageSegment[],
        name: msg.name,
        assistantType: msg.assistantType,
        authorType: msg.authorType,
        timestamp: msg.timestamp,
        avatar: msg.avatar,
      })),
    );

    // Empty snapshot (the merge itself also guards this): skip the no-op store write.
    if (storeMessages.length === 0) {
      processedPageCountRef.current = pages.length;
      return;
    }

    const isPagination = processedPageCountRef.current > 0 && pages.length > processedPageCountRef.current;

    if (!isPagination) {
      const merged = mergeHistoryWithRealtime({
        processedHistory: storeMessages,
        rawHistoryIds: new Set(flatMessages.map(m => m.id)),
        existingMessages: getMessages(side),
        streamingMessageId,
        historyFetchedAt: dataUpdatedAt,
        historyMaxStreamSeq: maxPersistedStreamSeq(pages),
        realtimeSeenStreamSeq: getHighestStreamSeq(side),
      });
      setMessages(side, merged);
    } else {
      const prepend = computeHistoryPrepend(storeMessages, getMessages(side));
      if (prepend) {
        prependWithBoundaryMerge(side, prepend.newMessages, prepend.boundaryMessageId, prepend.boundaryUpdates);
      }
    }

    processedPageCountRef.current = pages.length;
  }, [
    side,
    messageDialogId,
    chatType,
    assistantConfig.name,
    assistantConfig.type,
    pages,
    dataUpdatedAt,
    isFetched,
    streamingMessageId,
    getMessages,
    setMessages,
    prependWithBoundaryMerge,
    mergeApprovalStatuses,
    getHighestStreamSeq,
  ]);
}
