'use client';

import {
  type AssistantType,
  type Message as ChatMessage,
  type HistoricalMessage,
  type MessageSegment,
  processHistoricalMessagesWithErrors,
} from '@flamingo-stack/openframe-frontend-core';
import { useEffect, useRef } from 'react';
import type { ChatType } from '../constants';
import type { MessagePage } from '../services/dialog-service.types';
import { type ChatSide, useDialogDetailsStore } from '../stores/dialog-details-store';

interface UseHistoricalMessageSyncOptions {
  side: ChatSide;
  messageDialogId: string | null;
  chatType: ChatType;
  assistantConfig: { name: string; type: AssistantType };
  pages: MessagePage[] | undefined;
  isFetched: boolean;
  onApprove: (requestId?: string) => void | Promise<void>;
  onReject: (requestId?: string) => void | Promise<void>;
}

/**
 * Runs `processHistoricalMessagesWithErrors` against each newly-fetched page of
 * ticket messages and feeds the result into the dialog-details-store.
 */
export function useHistoricalMessages({
  side,
  messageDialogId,
  chatType,
  assistantConfig,
  pages,
  isFetched,
  onApprove,
  onReject,
}: UseHistoricalMessageSyncOptions) {
  const getMessages = useDialogDetailsStore(s => s.getMessages);
  const setMessages = useDialogDetailsStore(s => s.setMessages);
  const prependWithBoundaryMerge = useDialogDetailsStore(s => s.prependWithBoundaryMerge);
  const approvalStatuses = useDialogDetailsStore(s => s.approvalStatuses);
  const mergeApprovalStatuses = useDialogDetailsStore(s => s.mergeApprovalStatuses);

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

    if (pages.length === processedPageCountRef.current) return;

    const flatMessages = [...pages].reverse().flatMap(page => [...page.messages].reverse());

    const historical: HistoricalMessage[] = flatMessages
      .filter(msg => msg.chatType === chatType)
      .map(msg => ({
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
    });

    const storeMessages: ChatMessage[] = processed.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content as string | MessageSegment[],
      name: msg.name,
      assistantType: msg.assistantType,
      authorType: msg.authorType,
      timestamp: msg.timestamp,
      avatar: msg.avatar,
    }));

    if (processedPageCountRef.current === 0) {
      const existing = getMessages(side);
      const processedIds = new Set(storeMessages.map(m => m.id));
      const realtimeOnly = existing.filter(m => {
        if (processedIds.has(m.id)) return false;
        if (m.id.startsWith('optimistic-') && m.role === 'user' && typeof m.content === 'string') {
          return !storeMessages.some(pm => pm.role === 'user' && pm.content === m.content);
        }
        return true;
      });
      setMessages(side, [...storeMessages, ...realtimeOnly]);
    } else {
      const existing = getMessages(side);
      const existingIds = new Set(existing.map(m => m.id));
      const newMessages: ChatMessage[] = [];
      let boundaryIndex = -1;
      for (let i = 0; i < storeMessages.length; i++) {
        if (existingIds.has(storeMessages[i].id)) {
          boundaryIndex = i;
          break;
        }
        newMessages.push(storeMessages[i]);
      }

      let boundaryMessageId: string | undefined;
      let boundaryUpdates: Partial<ChatMessage> | undefined;
      if (boundaryIndex >= 0) {
        const boundary = storeMessages[boundaryIndex];
        const existingBoundary = existing.find(m => m.id === boundary.id);
        if (existingBoundary && JSON.stringify(existingBoundary.content) !== JSON.stringify(boundary.content)) {
          boundaryMessageId = boundary.id;
          boundaryUpdates = { content: boundary.content };
        }
      }

      if (newMessages.length > 0 || boundaryUpdates) {
        prependWithBoundaryMerge(side, newMessages, boundaryMessageId, boundaryUpdates);
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
    isFetched,
    getMessages,
    setMessages,
    prependWithBoundaryMerge,
    mergeApprovalStatuses,
  ]);
}
