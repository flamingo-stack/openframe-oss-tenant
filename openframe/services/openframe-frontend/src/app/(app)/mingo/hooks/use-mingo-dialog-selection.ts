'use client';

import {
  computeHistoryPrepend,
  flattenMessagePagesChronological,
  type HistoricalMessage,
  maxPersistedStreamSeq,
  mergeHistoryWithRealtime,
  processHistoricalMessagesWithErrors,
} from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EVENT_SUBTYPE, trackDashboardActivity } from '@/lib/analytics';
import { apiClient } from '@/lib/api-client';
import { foldPendingApprovalsEnvelope } from '@/lib/chat-history';
import { featureFlags } from '@/lib/feature-flags';
import type { ApprovalStatus } from '../../tickets/constants';
import { APPROVAL_STATUS, ASSISTANT_CONFIG, CHAT_TYPE, MESSAGE_TYPE } from '../../tickets/constants';
import { GET_MINGO_DIALOG_QUERY, getMingoDialogMessagesQuery } from '../queries/dialogs-queries';
import { useApproveRequestMutation, useRejectRequestMutation } from '../services/mingo-api-service';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { DialogResponse, Message, MessagePage, MessagesResponse } from '../types';

export function useMingoDialogSelection() {
  const { toast } = useToast();
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({});
  const {
    activeDialogId,
    setActiveDialogId,
    setMessages,
    prependWithBoundaryMerge,
    getMessages,
    getStreamingMessage,
    setStreamingMessage,
    setTyping,
    getHighestStreamSeq,
    setLoadingDialog,
    setLoadingMessages,
    setPagination,
    updateApprovalStatusInMessages,
  } = useMingoMessagesStore();

  const approveRequestMutation = useApproveRequestMutation();
  const rejectRequestMutation = useRejectRequestMutation();

  const handleApprove = useCallback(
    async (requestId?: string) => {
      if (!requestId || !activeDialogId) return;

      // Optimistically flip *before* the network round-trip. Backend starts
      // streaming the continuation immediately on approval; if we wait for
      // the mutation to resolve, the incoming message_start chunk sees the
      // bubble as still-pending and adopts it, then text chunks overwrite
      // the approval card. Flipping first means isInProgress returns false
      // for the resolved approval and the next chunk spawns a fresh bubble.
      setApprovalStatuses(prev => ({
        ...prev,
        [requestId]: APPROVAL_STATUS.APPROVED,
      }));
      updateApprovalStatusInMessages(activeDialogId, requestId, APPROVAL_STATUS.APPROVED);

      try {
        await approveRequestMutation.mutateAsync(requestId);
        trackDashboardActivity(EVENT_SUBTYPE.APPROVE_MINGO_COMMAND);
      } catch (error) {
        toast({
          title: 'Approval Failed',
          description: error instanceof Error ? error.message : 'Unable to approve request',
          variant: 'destructive',
          duration: 5000,
        });
      }
    },
    [approveRequestMutation, toast, activeDialogId, updateApprovalStatusInMessages],
  );

  const handleReject = useCallback(
    async (requestId?: string) => {
      if (!requestId || !activeDialogId) return;

      setApprovalStatuses(prev => ({
        ...prev,
        [requestId]: APPROVAL_STATUS.REJECTED,
      }));
      updateApprovalStatusInMessages(activeDialogId, requestId, APPROVAL_STATUS.REJECTED);

      try {
        await rejectRequestMutation.mutateAsync(requestId);
        trackDashboardActivity(EVENT_SUBTYPE.REJECT_MINGO_COMMAND);
      } catch (error) {
        toast({
          title: 'Rejection Failed',
          description: error instanceof Error ? error.message : 'Unable to reject request',
          variant: 'destructive',
          duration: 5000,
        });
      }
    },
    [rejectRequestMutation, toast, activeDialogId, updateApprovalStatusInMessages],
  );

  const handleApproveRef = useRef(handleApprove);
  handleApproveRef.current = handleApprove;
  const handleRejectRef = useRef(handleReject);
  handleRejectRef.current = handleReject;
  const approvalStatusesRef = useRef(approvalStatuses);
  approvalStatusesRef.current = approvalStatuses;

  const dialogQuery = useQuery({
    queryKey: ['mingo-dialog', activeDialogId],
    queryFn: async () => {
      if (!activeDialogId) return null;

      const response = await apiClient.post<DialogResponse>('/chat/graphql', {
        query: GET_MINGO_DIALOG_QUERY,
        variables: { id: activeDialogId },
      });

      if (!response.ok || !response.data?.data?.dialog) {
        throw new Error(response.error || 'Failed to fetch dialog');
      }

      return response.data.data.dialog;
    },
    enabled: !!activeDialogId,
    staleTime: 30 * 1000,
    // Self-heals if every chunk carrying streamState=IDLE is dropped; off while idle.
    refetchInterval: query => (query.state.data?.streamState === 'STREAMING' ? 15_000 : false),
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: ['mingo-dialog-messages', activeDialogId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<MessagePage> => {
      if (!activeDialogId) return { messages: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };

      const includeThinking = featureFlags.thinking.enabled();
      const response = await apiClient.post<MessagesResponse>('/chat/graphql', {
        query: getMingoDialogMessagesQuery({ includeThinking }),
        variables: {
          dialogId: activeDialogId,
          cursor: pageParam,
          limit: 50,
          sortField: 'createdAt',
          sortDirection: 'DESC',
        },
      });

      if (!response.ok || !response.data?.data?.messages) {
        throw new Error(response.error || 'Failed to fetch messages');
      }

      const { edges, pageInfo } = response.data.data.messages;
      const allMessages = edges.map(edge => edge.node);
      const adminMessages = allMessages.filter(msg => msg.chatType === CHAT_TYPE.ADMIN);

      return { messages: adminMessages, pageInfo };
    },
    getNextPageParam: (lastPage: MessagePage) => {
      return lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!activeDialogId,
    staleTime: 30 * 1000,
  });

  const initialOptStartSeq = useMemo(
    () => maxPersistedStreamSeq(messagesQuery.data?.pages),
    [messagesQuery.data?.pages],
  );

  const chronologicalMessages = useMemo(
    () => flattenMessagePagesChronological(messagesQuery.data?.pages),
    [messagesQuery.data?.pages],
  );

  // Close a streaming entry left behind by unmounting mid-stream (onStreamEnd
  // never fired, and the STREAM_END chunk is not guaranteed to replay). The
  // server-side IDLE is authoritative; the seq baseline guards the race where
  // a stale pre-stream fetch resolves as IDLE mid-stream — any chunk for this
  // dialog since it was opened means a STREAM_END will follow and owns the
  // closure.
  const dialogStreamState = dialogQuery.data?.streamState;
  const baselineSeqRef = useRef<{ dialogId: string | null; seq: number }>({ dialogId: null, seq: 0 });
  useEffect(() => {
    if (!activeDialogId) return;
    if (baselineSeqRef.current.dialogId !== activeDialogId) {
      baselineSeqRef.current = { dialogId: activeDialogId, seq: getHighestStreamSeq(activeDialogId) };
    }
    // Only a post-mount fetch is trusted for closure — a cache-served IDLE
    // inside the staleTime window may predate a stream.
    if (dialogStreamState !== 'IDLE' || !dialogQuery.isFetchedAfterMount) return;
    if (getHighestStreamSeq(activeDialogId) > baselineSeqRef.current.seq) return;
    if (getStreamingMessage(activeDialogId)) {
      setStreamingMessage(activeDialogId, null);
      setTyping(activeDialogId, false);
    }
  }, [
    activeDialogId,
    dialogStreamState,
    dialogQuery.isFetchedAfterMount,
    getHighestStreamSeq,
    getStreamingMessage,
    setStreamingMessage,
    setTyping,
  ]);

  // Streaming exemption for the history merge, gated on the same server-side
  // signal so a not-yet-closed stale entry can't exempt its synthetic.
  const streamingEntryId = useMingoMessagesStore(s =>
    activeDialogId ? (s.streamingMessages.get(activeDialogId)?.id ?? null) : null,
  );
  const streamingExemptId = dialogStreamState === 'IDLE' ? null : streamingEntryId;

  const selectDialogMutation = useMutation({
    mutationFn: async (dialogId: string) => {
      // Don't clear messages - let them persist for fast switching
      // Only clear pagination state for new queries
      setPagination(false, null, null);

      setLoadingDialog(true);
      setLoadingMessages(true);

      setActiveDialogId(dialogId);

      return dialogId;
    },
  });

  useEffect(() => {
    if (chronologicalMessages.length > 0 && activeDialogId) {
      const extractedStatuses = chronologicalMessages.reduce<Record<string, ApprovalStatus>>((acc, msg) => {
        const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData];

        messageDataArray.forEach((data: any) => {
          if (data?.type === MESSAGE_TYPE.APPROVAL_RESULT && data.approvalRequestId) {
            acc[data.approvalRequestId] = data.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
          }
        });

        return acc;
      }, {});

      if (Object.keys(extractedStatuses).length > 0) {
        setApprovalStatuses(prev => {
          const hasChanges = Object.entries(extractedStatuses).some(([k, v]) => prev[k] !== v);
          return hasChanges ? { ...prev, ...extractedStatuses } : prev;
        });
      }
    }
  }, [chronologicalMessages, activeDialogId]);

  // All three fields gate the merge: page count detects fetchNextPage
  // appends, dataUpdatedAt detects in-place refetches (same count, new
  // content), exemptId re-runs the merge when a stream starts/ends — the
  // moment an exempted synthetic becomes droppable.
  const processedHistoryRef = useRef<{ pageCount: number; dataUpdatedAt: number; exemptId: string | null }>({
    pageCount: 0,
    dataUpdatedAt: 0,
    exemptId: null,
  });
  const prevActiveDialogIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!messagesQuery.data?.pages || !activeDialogId || !messagesQuery.isFetched) return;

    const pages = messagesQuery.data.pages;
    const dataUpdatedAt = messagesQuery.dataUpdatedAt;

    if (activeDialogId !== prevActiveDialogIdRef.current) {
      processedHistoryRef.current = { pageCount: 0, dataUpdatedAt: 0, exemptId: null };
      prevActiveDialogIdRef.current = activeDialogId;
    }

    const prevProcessed = processedHistoryRef.current;
    if (
      pages.length === prevProcessed.pageCount &&
      dataUpdatedAt === prevProcessed.dataUpdatedAt &&
      streamingExemptId === prevProcessed.exemptId
    ) {
      return;
    }

    // The queryFn already filters to ADMIN messages — no re-filter needed.
    const historicalMessages: HistoricalMessage[] = chronologicalMessages.map(msg => ({
      id: msg.id,
      dialogId: msg.dialogId,
      chatType: msg.chatType,
      createdAt: msg.createdAt,
      owner: msg.owner,
      messageData: msg.messageData,
    }));

    const assistantConfig = ASSISTANT_CONFIG.MINGO;
    const { messages: rawProcessedMessages } = processHistoricalMessagesWithErrors(historicalMessages, {
      assistantName: assistantConfig.name,
      assistantType: assistantConfig.type,
      chatTypeFilter: CHAT_TYPE.ADMIN,
      onApprove: handleApproveRef.current,
      onReject: handleRejectRef.current,
      approvalStatuses: Object.fromEntries(Object.entries(approvalStatusesRef.current).map(([k, v]) => [k, v as any])),
      batchApprovalsEnabled: featureFlags.batchApproval.enabled(),
    });
    const allProcessedMessages = foldPendingApprovalsEnvelope(rawProcessedMessages as Message[]);

    if (allProcessedMessages.length === 0) {
      processedHistoryRef.current = { pageCount: pages.length, dataUpdatedAt, exemptId: streamingExemptId };
      return;
    }

    const existingMessages = getMessages(activeDialogId);

    // fetchNextPage appended an older page below what's already rendered —
    // prepend only the new head. Anything else (first sync for this dialog,
    // or an in-place refetch of known pages) rebuilds the list via the full
    // merge, which dedupes realtime synthetics against persisted history.
    const isPageAppend = prevProcessed.pageCount > 0 && pages.length > prevProcessed.pageCount;

    if (isPageAppend) {
      const prepend = computeHistoryPrepend(allProcessedMessages, existingMessages);
      if (prepend) {
        prependWithBoundaryMerge(
          activeDialogId,
          prepend.newMessages,
          prepend.boundaryMessageId,
          prepend.boundaryUpdates,
        );
      }
    } else {
      const merged = mergeHistoryWithRealtime({
        processedHistory: allProcessedMessages,
        rawHistoryIds: new Set(chronologicalMessages.map(msg => msg.id)),
        existingMessages,
        streamingMessageId: streamingExemptId,
        historyFetchedAt: dataUpdatedAt,
        historyMaxStreamSeq: initialOptStartSeq,
        realtimeSeenStreamSeq: getHighestStreamSeq(activeDialogId),
      });
      setMessages(activeDialogId, merged);
    }

    processedHistoryRef.current = { pageCount: pages.length, dataUpdatedAt, exemptId: streamingExemptId };

    const lastPage = pages[pages.length - 1];
    if (lastPage) {
      setPagination(
        lastPage.pageInfo.hasPreviousPage,
        pages[0]?.pageInfo.startCursor || null,
        lastPage.pageInfo.endCursor || null,
      );
    }
  }, [
    messagesQuery.data?.pages,
    messagesQuery.dataUpdatedAt,
    activeDialogId,
    messagesQuery.isFetched,
    chronologicalMessages,
    streamingExemptId,
    initialOptStartSeq,
    getMessages,
    getHighestStreamSeq,
    setMessages,
    prependWithBoundaryMerge,
    setPagination,
  ]);

  return {
    selectDialog: selectDialogMutation.mutate,
    isSelectingDialog: selectDialogMutation.isPending,
    isLoadingDialog: dialogQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    rawMessagesCount: chronologicalMessages.length,
    dialogError: dialogQuery.error?.message || null,
    messagesError: messagesQuery.error?.message || null,
    refetchDialog: dialogQuery.refetch,
    refetchMessages: messagesQuery.refetch,
    dialogData: dialogQuery.data ?? null,
    // Approval handlers for real-time processing
    handleApprove,
    handleReject,
    approvalStatuses,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    fetchNextPage: messagesQuery.fetchNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    initialOptStartSeq,
    isMessagesFetched: messagesQuery.isFetched,
  };
}
