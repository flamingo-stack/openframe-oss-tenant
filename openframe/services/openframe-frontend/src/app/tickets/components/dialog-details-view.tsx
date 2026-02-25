'use client';

import {
  Button,
  ChatApprovalStatus,
  ChatInput,
  ChatMessageList,
  DetailPageContainer,
  type HistoricalMessage,
  MessageCircleIcon,
  type MessageSegment,
  processHistoricalMessagesWithErrors,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { DetailLoader, ProcessedMessage } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DeviceInfoSection } from '../../components/shared';
import {
  API_ENDPOINTS,
  APPROVAL_STATUS,
  type ApprovalStatus,
  ASSISTANT_CONFIG,
  CHAT_TYPE,
  DIALOG_STATUS,
  MESSAGE_TYPE,
  type NatsMessageType,
} from '../constants';
import { useApprovalRequests } from '../hooks/use-approval-requests';
import { useChunkCatchup } from '../hooks/use-chunk-catchup';
import { useDialogRealtimeProcessor } from '../hooks/use-dialog-realtime-processor';
import { useDialogStatus } from '../hooks/use-dialog-status';
import { useNatsDialogSubscription } from '../hooks/use-nats-dialog-subscription';
import { useDialogDetailsStore } from '../stores/dialog-details-store';
import type { ClientDialogOwner, DialogOwner, Message } from '../types/dialog.types';

interface DialogDetailsViewProps {
  dialogId: string;
}

export function DialogDetailsView({ dialogId }: DialogDetailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const isClientOwner = (owner: ClientDialogOwner | DialogOwner): owner is ClientDialogOwner => {
    return owner != null && typeof owner === 'object' && 'machineId' in owner;
  };

  const {
    currentDialog: dialog,
    currentMessages: messages,
    adminMessages,
    isLoadingDialog: isLoading,
    isLoadingMessages: messagesLoading,
    hasMoreMessages: hasMore,
    isClientChatTyping,
    isAdminChatTyping,
    fetchDialog,
    fetchMessages,
    loadMore,
    clearCurrent,
    updateDialogStatus,
    addRealtimeMessage,
    setTypingIndicator,
  } = useDialogDetailsStore();
  const { putOnHold, resolve, isUpdating } = useDialogStatus();
  const { handleApproveRequest, handleRejectRequest } = useApprovalRequests();
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({});
  const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState('client');
  const hasCaughtUp = useRef(false);

  const { processChunk: processRealtimeChunk } = useDialogRealtimeProcessor({
    dialogId,
    onStreamStart: isAdmin => {
      setTypingIndicator(isAdmin, true);
    },
    onStreamEnd: isAdmin => {
      setTypingIndicator(isAdmin, false);
    },
    onMessageAdd: (message, isAdmin) => {
      addRealtimeMessage(message, isAdmin);
    },
    onError: (error, isAdmin) => {},
  });

  const { catchUpChunks, processChunk, resetChunkTracking, startInitialBuffering } = useChunkCatchup({
    dialogId,
    onChunkReceived: processRealtimeChunk,
  });

  useEffect(() => {
    if (!dialogId) return;

    resetChunkTracking();
    startInitialBuffering();
    hasCaughtUp.current = false;

    const loadData = async () => {
      await Promise.all([fetchDialog(dialogId), fetchMessages(dialogId)]);
    };

    loadData();

    return () => {
      clearCurrent();
      resetChunkTracking();
      hasCaughtUp.current = false;
    };
  }, [dialogId, clearCurrent, fetchDialog, fetchMessages, resetChunkTracking, startInitialBuffering]);

  // Extract approval statuses from messages
  useEffect(() => {
    const extractedStatuses = messages.reduce<Record<string, ApprovalStatus>>((acc, msg) => {
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
  }, [messages]);

  // NATS subscription
  const handleNatsEvent = useCallback(
    (payload: unknown, messageType: NatsMessageType) => {
      const processed = processChunk(payload as any, messageType as 'message' | 'admin-message');
      if (!processed) return;
    },
    [processChunk],
  );

  const handleNatsSubscribed = useCallback(async () => {
    if (!hasCaughtUp.current && dialogId) {
      hasCaughtUp.current = true;
      await catchUpChunks();
    }
  }, [dialogId, catchUpChunks]);

  useNatsDialogSubscription({
    enabled: !!dialogId,
    dialogId,
    onEvent: handleNatsEvent,
    onSubscribed: handleNatsSubscribed,
  });

  const handlePutOnHold = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const success = await putOnHold(dialogId);
    if (success) {
      updateDialogStatus(DIALOG_STATUS.ON_HOLD);
    }
  }, [dialog, isUpdating, putOnHold, dialogId, updateDialogStatus]);

  const handleResolve = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const success = await resolve(dialogId);
    if (success) {
      updateDialogStatus(DIALOG_STATUS.RESOLVED);
    }
  }, [dialog, isUpdating, resolve, dialogId, updateDialogStatus]);

  const handleApprove = useCallback(
    async (requestId?: string) => {
      if (!requestId) return;

      try {
        await handleApproveRequest(requestId);
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: APPROVAL_STATUS.APPROVED,
        }));
      } catch (error) {
        toast({
          title: 'Approval Failed',
          description: error instanceof Error ? error.message : 'Unable to approve request',
          variant: 'destructive',
          duration: 5000,
        });
      }
    },
    [handleApproveRequest, toast],
  );

  const handleReject = useCallback(
    async (requestId?: string) => {
      if (!requestId) return;

      try {
        await handleRejectRequest(requestId);
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: APPROVAL_STATUS.REJECTED,
        }));
      } catch (error) {
        toast({
          title: 'Rejection Failed',
          description: error instanceof Error ? error.message : 'Unable to reject request',
          variant: 'destructive',
          duration: 5000,
        });
      }
    },
    [handleRejectRequest, toast],
  );

  const handleSendAdminMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage || isSendingAdminMessage) return;

      setIsSendingAdminMessage(true);
      try {
        await apiClient.post(API_ENDPOINTS.SEND_MESSAGE, {
          dialogId,
          content: trimmedMessage,
          chatType: CHAT_TYPE.ADMIN,
        });
      } catch (error) {
        toast({
          title: 'Send Failed',
          description: error instanceof Error ? error.message : 'Unable to send message',
          variant: 'destructive',
          duration: 5000,
        });
      } finally {
        setIsSendingAdminMessage(false);
      }
    },
    [dialogId, isSendingAdminMessage, toast],
  );

  const processMessages = useCallback(
    (messages: Message[], expectedChatType?: (typeof CHAT_TYPE)[keyof typeof CHAT_TYPE]) => {
      const assistantConfig = expectedChatType === CHAT_TYPE.ADMIN ? ASSISTANT_CONFIG.MINGO : ASSISTANT_CONFIG.FAE;
      const { type: assistantType, name: assistantName } = assistantConfig;

      const historicalMessages: HistoricalMessage[] = messages.map(msg => ({
        id: msg.id,
        dialogId: msg.dialogId,
        chatType: msg.chatType,
        createdAt: msg.createdAt,
        owner: msg.owner,
        messageData: msg.messageData,
      }));

      const { messages: processed } = processHistoricalMessagesWithErrors(historicalMessages, {
        assistantName,
        assistantType,
        chatTypeFilter: expectedChatType,
        onApprove: handleApprove,
        onReject: handleReject,
        approvalStatuses: Object.fromEntries(
          Object.entries(approvalStatuses).map(([k, v]) => [k, v as ChatApprovalStatus]),
        ),
      });

      const pendingApprovalSegments: MessageSegment[] = [];
      const filteredMessages = processed.filter((msg: ProcessedMessage) => {
        if (msg.id.startsWith('pending-approvals-') && Array.isArray(msg.content)) {
          msg.content.forEach((segment: MessageSegment) => {
            if (segment.type === 'approval_request' && segment.status === 'pending') {
              pendingApprovalSegments.push(segment as MessageSegment);
            }
          });
          return false;
        }
        return true;
      });

      const processedMessages = filteredMessages.map((msg: ProcessedMessage) => ({
        id: msg.id,
        content: msg.content as string | MessageSegment[],
        role: msg.role as 'user' | 'assistant' | 'error',
        name: msg.name,
        assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
        timestamp: msg.timestamp,
      }));

      return {
        messages: processedMessages,
        pendingApprovals: pendingApprovalSegments,
        assistantType,
        assistantName,
      };
    },
    [approvalStatuses, handleApprove, handleReject],
  );

  const chatData = useMemo(() => processMessages(messages, CHAT_TYPE.CLIENT), [messages, processMessages]);
  const adminChatData = useMemo(
    () => processMessages(adminMessages, CHAT_TYPE.ADMIN),
    [adminMessages, processMessages],
  );

  const headerActions = useMemo(() => {
    if (!dialog) return null;

    const isHoldOrResolved = dialog.status === DIALOG_STATUS.ON_HOLD || dialog.status === DIALOG_STATUS.RESOLVED;
    const isResolved = dialog.status === DIALOG_STATUS.RESOLVED;

    return (
      <div className="flex gap-4 items-center">
        {!isHoldOrResolved && (
          <Button
            variant="ghost"
            className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            leftIcon={<Clock className="h-6 w-6 text-ods-text-primary" />}
            onClick={handlePutOnHold}
            disabled={isUpdating}
          >
            <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
              {isUpdating ? 'Updating...' : 'Put On Hold'}
            </span>
          </Button>
        )}
        {!isResolved && (
          <Button
            variant="ghost"
            className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            leftIcon={<CheckCircle className="h-6 w-6 text-ods-text-primary" />}
            onClick={handleResolve}
            disabled={isUpdating}
          >
            <span className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary tracking-[-0.36px]">
              {isUpdating ? 'Updating...' : 'Resolve'}
            </span>
          </Button>
        )}
      </div>
    );
  }, [dialog, isUpdating, handlePutOnHold, handleResolve]);

  if (isLoading || !dialog) {
    return <DetailLoader />;
  }

  return (
    <DetailPageContainer
      title={dialog.title}
      backButton={{
        label: 'Back to Chats',
        onClick: () => router.push('/tickets'),
      }}
      padding="none"
      className="h-full pt-6 gap-2"
      headerActions={headerActions}
      contentClassName="flex flex-col min-h-0"
    >
      {/* Device Info Section */}
      {isClientOwner(dialog.owner) && dialog.owner.machineId && (
        <DeviceInfoSection
          deviceId={dialog.owner.machineId}
          device={
            dialog.owner.machine
              ? {
                  id: dialog.owner.machine.id,
                  machineId: dialog.owner.machine.machineId,
                  hostname: dialog.owner.machine.hostname,
                  displayName: dialog.owner.machine.hostname,
                }
              : undefined
          }
        />
      )}

      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab bar — visible only on mobile/tablet */}
        <Tabs value={activeChatTab} onValueChange={setActiveChatTab} className="lg:hidden mb-2">
          <TabsList className="w-full">
            <TabsTrigger value="client" className="flex-1">
              Client Chat
            </TabsTrigger>
            <TabsTrigger value="technician" className="flex-1">
              Technician Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Chat panels — tabs on mobile, side-by-side on desktop */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Client Chat */}
          <div
            className={cn(
              'flex-1 lg:basis-1/2 min-w-0 flex flex-col gap-1 min-h-0',
              activeChatTab !== 'client' ? 'hidden lg:flex' : 'flex',
            )}
          >
            <h2 className="hidden lg:block font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px]">
              Client Chat
            </h2>
            {/* Messages card */}
            <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
              <ChatMessageList
                messages={chatData.messages}
                autoScroll={true}
                showAvatars={false}
                isTyping={isClientChatTyping}
                pendingApprovals={chatData.pendingApprovals}
                assistantType={chatData.assistantType}
              />
              {hasMore && !messagesLoading && (
                <div className="p-2 text-center border-t border-ods-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadMore()}
                    className="text-ods-text-secondary hover:text-ods-text-primary"
                  >
                    Load More Messages
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Technician Chat */}
          <div
            className={cn(
              'flex-1 lg:basis-1/2 min-w-0 flex flex-col gap-1 min-h-0',
              activeChatTab !== 'technician' ? 'hidden lg:flex' : 'flex',
            )}
          >
            <h2 className="hidden lg:block font-['Azeret_Mono'] font-medium text-[14px] text-ods-text-secondary uppercase tracking-[-0.28px]">
              Technician Chat
            </h2>
            <div className="flex-1 flex flex-col relative min-h-0">
              {adminMessages.length === 0 ? (
                /* Empty State */
                <div className="bg-ods-card border border-ods-border rounded-lg flex-1 flex flex-col items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MessageCircleIcon className="h-8 w-8 text-ods-text-secondary" />
                      </div>
                    </div>
                    <p className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-secondary max-w-xs">
                      Start a technician conversation
                    </p>
                  </div>
                </div>
              ) : (
                /* Messages */
                <ChatMessageList
                  className="flex-1 bg-ods-card border border-ods-border rounded-lg"
                  messages={adminChatData.messages}
                  autoScroll={true}
                  showAvatars={false}
                  isTyping={isAdminChatTyping}
                  pendingApprovals={adminChatData.pendingApprovals}
                  assistantType={adminChatData.assistantType}
                />
              )}

              {/* Message Input */}
              <ChatInput
                reserveAvatarOffset={false}
                placeholder="Enter your Request..."
                onSend={handleSendAdminMessage}
                sending={isSendingAdminMessage || isAdminChatTyping}
                autoFocus={false}
                className="mt-2 bg-ods-card rounded-lg max-w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </DetailPageContainer>
  );
}
