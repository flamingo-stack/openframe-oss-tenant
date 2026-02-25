'use client';

import { type HistoricalMessage, processHistoricalMessagesWithErrors } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ApprovalStatus } from '../../tickets/constants';
import { APPROVAL_STATUS, ASSISTANT_CONFIG, CHAT_TYPE, MESSAGE_TYPE } from '../../tickets/constants';
import { GET_DIALOG_MESSAGES_QUERY, GET_MINGO_DIALOG_QUERY } from '../queries/dialogs-queries';
import { useApproveRequestMutation, useRejectRequestMutation } from '../services/mingo-api-service';
import { useMingoMessagesStore } from '../stores/mingo-messages-store';
import type { DialogResponse, MessagePage, MessagesResponse } from '../types';

export function useMingoDialogSelection() {
  const { toast } = useToast();
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({});

  const {
    activeDialogId,
    setActiveDialogId,
    setMessages,
    getMessages,
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

      try {
        await approveRequestMutation.mutateAsync(requestId);
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: APPROVAL_STATUS.APPROVED,
        }));
        updateApprovalStatusInMessages(activeDialogId, requestId, APPROVAL_STATUS.APPROVED);
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

      try {
        await rejectRequestMutation.mutateAsync(requestId);
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: APPROVAL_STATUS.REJECTED,
        }));
        updateApprovalStatusInMessages(activeDialogId, requestId, APPROVAL_STATUS.REJECTED);
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
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: ['mingo-dialog-messages', activeDialogId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<MessagePage> => {
      if (!activeDialogId) return { messages: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };

      const response = await apiClient.post<MessagesResponse>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: {
          dialogId: activeDialogId,
          cursor: pageParam,
          limit: 100,
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
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && !messagesQuery.isLoading) {
      messagesQuery.fetchNextPage();
    }
  }, [
    messagesQuery.hasNextPage,
    messagesQuery.isFetchingNextPage,
    messagesQuery.isLoading,
    messagesQuery.fetchNextPage,
  ]);

  useEffect(() => {
    if (messagesQuery.data?.pages && activeDialogId) {
      const allGraphQlMessages = messagesQuery.data.pages.flatMap(page => page.messages);

      // Extract approval statuses from GraphQL messages
      const extractedStatuses = allGraphQlMessages.reduce<Record<string, ApprovalStatus>>((acc, msg) => {
        const messageDataArray = Array.isArray(msg.messageData) ? msg.messageData : [msg.messageData];

        messageDataArray.forEach((data: any) => {
          if (data?.type === MESSAGE_TYPE.APPROVAL_RESULT && data.approvalRequestId) {
            acc[data.approvalRequestId] = data.approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
          }
        });

        return acc;
      }, {});

      if (Object.keys(extractedStatuses).length > 0) {
        setApprovalStatuses(prev => ({ ...prev, ...extractedStatuses }));
      }
    }
  }, [messagesQuery.data?.pages, activeDialogId]);

  useEffect(() => {
    if (messagesQuery.data?.pages && activeDialogId) {
      const allGraphQlMessages = messagesQuery.data.pages.flatMap(page => page.messages);

      // Convert GraphQL messages to HistoricalMessage format
      const historicalMessages: HistoricalMessage[] = allGraphQlMessages
        .filter(msg => msg.chatType === CHAT_TYPE.ADMIN)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(msg => ({
          id: msg.id,
          dialogId: msg.dialogId,
          chatType: msg.chatType,
          createdAt: msg.createdAt,
          owner: msg.owner,
          messageData: msg.messageData,
        }));

      const assistantConfig = ASSISTANT_CONFIG.MINGO;
      const { messages: coreMessages } = processHistoricalMessagesWithErrors(historicalMessages, {
        assistantName: assistantConfig.name,
        assistantType: assistantConfig.type,
        chatTypeFilter: CHAT_TYPE.ADMIN,
        onApprove: handleApproveRef.current,
        onReject: handleRejectRef.current,
        approvalStatuses: Object.fromEntries(Object.entries(approvalStatuses).map(([k, v]) => [k, v as any])),
      });

      const allPagesLoaded = !messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage;
      const existingMessages = getMessages(activeDialogId);
      if (messagesQuery.isFetched && allPagesLoaded && coreMessages.length > 0 && existingMessages.length === 0) {
        setMessages(activeDialogId, coreMessages);
      }

      const lastPage = messagesQuery.data.pages[messagesQuery.data.pages.length - 1];
      if (lastPage) {
        setPagination(
          lastPage.pageInfo.hasPreviousPage,
          messagesQuery.data.pages[0]?.pageInfo.startCursor || null,
          lastPage.pageInfo.endCursor || null,
        );
      }
    }
  }, [
    messagesQuery.data?.pages,
    activeDialogId,
    approvalStatuses,
    messagesQuery.hasNextPage,
    messagesQuery.isFetched,
    messagesQuery.isFetchingNextPage,
    getMessages,
    setMessages,
    setPagination,
  ]);

  return {
    selectDialog: selectDialogMutation.mutate,
    isSelectingDialog: selectDialogMutation.isPending,
    isLoadingDialog: dialogQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    rawMessagesCount: messagesQuery.data?.pages.reduce((total, page) => total + page.messages.length, 0) || 0,
    dialogError: dialogQuery.error?.message || null,
    messagesError: messagesQuery.error?.message || null,
    refetchDialog: dialogQuery.refetch,
    refetchMessages: messagesQuery.refetch,
    // Approval handlers for real-time processing
    handleApprove,
    handleReject,
    approvalStatuses,
  };
}
