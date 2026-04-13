'use client';

import {
  ActionsMenu,
  type ActionsMenuGroup,
  Button,
  ChatApprovalStatus,
  ChatInput,
  ChatMessageList,
  type HistoricalMessage,
  LoadError,
  MessageCircleIcon,
  type MessageSegment,
  NotFoundError,
  processHistoricalMessagesWithErrors,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { ChatsIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DetailLoader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  getTicketStatusTag,
  PageLayout,
  ProcessedMessage,
  TicketInfoSection,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { CheckCircle, ChevronDown, Clock, Monitor, PenLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { useAuthStore } from '@/stores';
import { DeviceInfoSection } from '../../components/shared';
import { formatFileSize } from '../../devices/utils/file-manager-utils';
import {
  APPROVAL_STATUS,
  type ApprovalStatus,
  ASSISTANT_CONFIG,
  CHAT_TYPE,
  CREATION_SOURCE,
  DIALOG_STATUS,
  MESSAGE_TYPE,
  type NatsMessageType,
} from '../constants';
import { useApprovalRequests } from '../hooks/use-approval-requests';
import { useChunkCatchup } from '../hooks/use-chunk-catchup';
import { useDialogRealtimeProcessor } from '../hooks/use-dialog-realtime-processor';
import { useDialogStatus } from '../hooks/use-dialog-status';
import { useDialogVersion } from '../hooks/use-dialog-version';
import { useDirectChat } from '../hooks/use-direct-chat';
import { useNatsDialogSubscription } from '../hooks/use-nats-dialog-subscription';
import { useDownloadTicketAttachment } from '../hooks/use-ticket-attachments';
import { useTicketMessages } from '../hooks/use-ticket-messages';
import { useAddTicketNote, useDeleteTicketNote, useUpdateTicketNote } from '../hooks/use-ticket-notes';
import { getDialogService } from '../services';
import { useDialogDetailsStore } from '../stores/dialog-details-store';
import type { ClientDialogOwner, DialogOwner, Message } from '../types/dialog.types';

interface DialogDetailsViewProps {
  dialogId: string;
}

export function DialogDetailsView({ dialogId }: DialogDetailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const version = useDialogVersion();
  const service = getDialogService(version);

  const isClientOwner = (owner: ClientDialogOwner | DialogOwner): owner is ClientDialogOwner => {
    return owner != null && typeof owner === 'object' && 'machineId' in owner;
  };

  const {
    currentDialog: dialog,
    currentMessages: realtimeClientMessages,
    adminMessages: realtimeAdminMessages,
    isLoadingDialog: isLoading,
    dialogError,
    isClientChatTyping,
    isAdminChatTyping,
    fetchDialog,
    clearCurrent,
    updateDialogStatus,
    addRealtimeMessage,
    setTypingIndicator,
  } = useDialogDetailsStore();

  const currentUser = useAuthStore(state => state.user);

  const refetchDialog = useCallback(() => {
    fetchDialog(dialogId, version);
  }, [fetchDialog, dialogId, version]);
  const addNoteMutation = useAddTicketNote(refetchDialog);
  const updateNoteMutation = useUpdateTicketNote(refetchDialog);
  const deleteNoteMutation = useDeleteTicketNote(refetchDialog);

  const { download: downloadAttachment } = useDownloadTicketAttachment();

  const { isDirectMode, isStartingDirectChat, isSendingClientMessage, startDirectChat, sendClientMessage } =
    useDirectChat({
      ticketId: dialogId,
      dialogId: dialog?.dialogId,
      currentMode: dialog?.currentMode,
      onDialogCreated: refetchDialog,
    });

  // Transform backend notes to core UI TicketNote format
  const uiNotes = useMemo(() => {
    if (!dialog?.notes) return [];
    return dialog.notes.map(note => ({
      id: note.id,
      text: note.content,
      authorName: note.authorName || 'Unknown',
      createdAt: note.createdAt,
      isOwn: currentUser?.id === note.authorId,
    }));
  }, [dialog?.notes, currentUser?.id]);

  // Transform backend attachments to core UI TicketAttachment format
  const uiAttachments = useMemo(() => {
    if (!dialog?.attachments) return [];
    return dialog.attachments.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileSize: att.fileSize ? formatFileSize(att.fileSize) : '',
      onDownload: () => downloadAttachment(att.id, att.fileName),
    }));
  }, [dialog?.attachments, downloadAttachment]);

  // In v2 the URL param is the ticket ID; messages belong to the linked dialog
  const messageDialogId = version === 'v2' ? (dialog?.dialogId ?? null) : dialogId;

  const clientChat = useTicketMessages(messageDialogId, CHAT_TYPE.CLIENT);
  const adminChat = useTicketMessages(messageDialogId, CHAT_TYPE.ADMIN);

  const messages = useMemo(() => {
    const pageIds = new Set(clientChat.messages.map(m => m.id));
    const realtimeOnly = realtimeClientMessages.filter(m => !pageIds.has(m.id));
    return [...clientChat.messages, ...realtimeOnly];
  }, [clientChat.messages, realtimeClientMessages]);

  const adminMessages = useMemo(() => {
    const pageIds = new Set(adminChat.messages.map(m => m.id));
    const realtimeOnly = realtimeAdminMessages.filter(m => !pageIds.has(m.id));
    return [...adminChat.messages, ...realtimeOnly];
  }, [adminChat.messages, realtimeAdminMessages]);
  const { putOnHold, resolve, isUpdating } = useDialogStatus();
  const { handleApproveRequest, handleRejectRequest } = useApprovalRequests();
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, ApprovalStatus>>({});
  const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false);
  const [isTicketInfoExpanded, setIsTicketInfoExpanded] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState('client');
  const hasCaughtUp = useRef(false);

  const { processChunk: processRealtimeChunk } = useDialogRealtimeProcessor({
    dialogId: messageDialogId ?? '',
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

  const { catchUpChunks, processChunk, resetChunkTracking, startInitialBuffering, resetAndCatchUp } = useChunkCatchup({
    dialogId: messageDialogId ?? '',
    onChunkReceived: processRealtimeChunk,
  });

  useEffect(() => {
    if (!dialogId) return;

    resetChunkTracking();
    startInitialBuffering();
    hasCaughtUp.current = false;

    fetchDialog(dialogId, version);

    return () => {
      clearCurrent();
      resetChunkTracking();
      hasCaughtUp.current = false;
    };
  }, [dialogId, clearCurrent, fetchDialog, resetChunkTracking, startInitialBuffering, version]);

  // Default to technician tab when ticket is admin-owned (no client chat)
  useEffect(() => {
    if (dialog?.owner?.type === 'ADMIN' && activeChatTab === 'client') {
      setActiveChatTab('technician');
    }
  }, [dialog?.owner?.type, activeChatTab]);

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
    if (!hasCaughtUp.current && messageDialogId) {
      hasCaughtUp.current = true;
      await catchUpChunks();
    }
  }, [messageDialogId, catchUpChunks]);

  const handleBeforeReconnect = useCallback(async () => {
    try {
      await apiClient.get('/api/me');
    } catch {
      // If refresh fails, apiClient will force-logout
    }
  }, []);

  const { reconnectionCount } = useNatsDialogSubscription({
    enabled: !!messageDialogId,
    dialogId: messageDialogId,
    onEvent: handleNatsEvent,
    onSubscribed: handleNatsSubscribed,
    onBeforeReconnect: handleBeforeReconnect,
  });

  useEffect(() => {
    if (reconnectionCount > 0 && messageDialogId) {
      resetAndCatchUp();
    }
  }, [reconnectionCount, messageDialogId, resetAndCatchUp]);

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

  const handleStopGeneration = useCallback(async () => {
    try {
      const response = await apiClient.post(`/chat/api/v1/dialogs/${messageDialogId}/stop`, {
        chatType: CHAT_TYPE.ADMIN,
      });
      if (!response.ok) {
        toast({
          title: 'Stop Failed',
          description: response.error || 'Unable to stop generation',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        setTypingIndicator(true, false);
      }
    } catch (error) {
      toast({
        title: 'Stop Failed',
        description: error instanceof Error ? error.message : 'Unable to stop generation',
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [messageDialogId, toast, setTypingIndicator]);

  const handleSendAdminMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage || isSendingAdminMessage) return;

      setIsSendingAdminMessage(true);
      try {
        messageDialogId && (await service.sendMessage(messageDialogId, trimmedMessage, CHAT_TYPE.ADMIN));
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
    [messageDialogId, isSendingAdminMessage, toast, service],
  );

  const clientDisplayName =
    dialog?.deviceHostname ||
    (dialog?.owner && isClientOwner(dialog.owner) ? dialog.owner.machine?.hostname : undefined) ||
    undefined;

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
        name: msg.authorType === 'user' && clientDisplayName ? clientDisplayName : msg.name,
        assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
        authorType: msg.authorType,
        timestamp: msg.timestamp,
      }));

      return {
        messages: processedMessages,
        pendingApprovals: pendingApprovalSegments,
        assistantType,
        assistantName,
      };
    },
    [approvalStatuses, handleApprove, handleReject, clientDisplayName],
  );

  const chatData = useMemo(() => processMessages(messages, CHAT_TYPE.CLIENT), [messages, processMessages]);
  const adminChatData = useMemo(
    () => processMessages(adminMessages, CHAT_TYPE.ADMIN),
    [adminMessages, processMessages],
  );

  const clientChatMessages = useMemo(() => {
    if (dialog?.creationSource !== CREATION_SOURCE.FAE_FORM || clientChat.hasNextPage) {
      return chatData.messages;
    }
    const faeMessage = {
      id: `synthetic-fae-form-${dialog.id}`,
      content: [
        'Your request has been received. We will contact you shortly.',
        '',
        'Subject:',
        dialog.title || '',
        '',
        'Description:',
        dialog.description || '(No description provided)',
      ].join('\n'),
      role: 'assistant' as const,
      name: ASSISTANT_CONFIG.FAE.name,
      assistantType: ASSISTANT_CONFIG.FAE.type,
      authorType: 'fae' as const,
      timestamp: new Date(dialog.createdAt),
    };
    return [faeMessage, ...chatData.messages];
  }, [chatData.messages, dialog, clientChat.hasNextPage]);

  const [actionsOpen, setActionsOpen] = useState(false);

  const headerActions = useMemo(() => {
    if (!dialog) return null;

    const isResolved = dialog.status === DIALOG_STATUS.RESOLVED;
    const isOnHold = dialog.status === DIALOG_STATUS.ON_HOLD;

    const menuGroups: ActionsMenuGroup[] = [
      {
        items: [
          ...(featureFlags.tickets.enabled()
            ? [
                {
                  id: 'edit-ticket',
                  label: 'Edit Ticket',
                  icon: <PenLine className="w-6 h-6" />,
                  onClick: () => {
                    setActionsOpen(false);
                    router.push(`/tickets/new?edit=${dialog.id}`);
                  },
                },
              ]
            : []),
          ...(!isOnHold && !isResolved
            ? [
                {
                  id: 'put-on-hold',
                  label: 'Put On Hold',
                  icon: <Clock className="w-6 h-6" />,
                  disabled: isUpdating,
                  onClick: () => {
                    setActionsOpen(false);
                    handlePutOnHold();
                  },
                },
              ]
            : []),
        ],
      },
    ];

    return (
      <div className="flex gap-4 items-center">
        <DropdownMenu modal={false} open={actionsOpen} onOpenChange={setActionsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              rightIcon={<ChevronDown className="h-5 w-5 text-ods-text-primary ml-2" />}
              className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            >
              <span className="text-h3 text-ods-text-primary">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-0 border-none">
            <ActionsMenu groups={menuGroups} onItemClick={() => setActionsOpen(false)} />
          </DropdownMenuContent>
        </DropdownMenu>

        {!isResolved && (
          <Button
            variant="ghost"
            className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            leftIcon={<CheckCircle className="h-6 w-6 text-ods-text-primary" />}
            onClick={handleResolve}
            disabled={isUpdating}
          >
            <span className="text-h3 text-ods-text-primary">{isUpdating ? 'Updating...' : 'Resolve'}</span>
          </Button>
        )}
      </div>
    );
  }, [dialog, isUpdating, actionsOpen, handlePutOnHold, handleResolve, router]);

  if (isLoading) {
    return <DetailLoader />;
  }

  if (dialogError) {
    return <LoadError message={`Error loading ticket: ${dialogError}`} />;
  }

  if (!dialog) {
    return <NotFoundError message="Ticket not found" />;
  }

  const isAdminOwner = dialog.owner?.type === 'ADMIN';
  const deviceMachineId = (isClientOwner(dialog.owner) && dialog.owner.machineId) || dialog.deviceId;

  return (
    <PageLayout
      title={dialog.title || 'Untitled Dialog'}
      backButton={{
        label: 'Back to Tickets',
        onClick: () => router.push('/tickets'),
      }}
      padding="none"
      className="h-[calc(100%)] gap-2"
      headerActions={headerActions}
      contentClassName="flex flex-col min-h-0"
    >
      {/* Ticket / Device Info Section — hidden on mobile (shown via tab instead) */}
      {version === 'v2' ? (
        <TicketInfoSection
          className="hidden lg:block shrink-0"
          organization={{
            name:
              dialog.organizationName ||
              (isClientOwner(dialog.owner) ? dialog.owner.machine?.organizationId : undefined) ||
              'Unassigned',
          }}
          user="Unassigned"
          device={{
            name:
              dialog.deviceHostname ||
              (isClientOwner(dialog.owner)
                ? dialog.owner.machine?.hostname || dialog.owner.machine?.displayName
                : undefined) ||
              'Unassigned',
            icon: <Monitor className="size-4" />,
            onClick: deviceMachineId ? () => router.push(`/devices/details/${deviceMachineId}`) : undefined,
          }}
          statusTag={getTicketStatusTag(dialog.status)}
          onExpand={() => setIsTicketInfoExpanded(prev => !prev)}
          expanded={isTicketInfoExpanded}
          assigned={{ name: dialog.assignedName || 'Unassigned' }}
          createdAt={dialog.createdAt ? new Date(dialog.createdAt).toLocaleString() : undefined}
          description={dialog.description || dialog.title || ''}
          attachments={uiAttachments}
          tags={(dialog.labels || []).map(l => l.name)}
          knowledgeBaseArticles={[]}
          notes={uiNotes}
          isAddingNote={addNoteMutation.isPending}
          onAddNote={text => {
            if (dialog?.id) addNoteMutation.mutate({ ticketId: dialog.id, content: text });
          }}
          onEditNote={(id, text) => {
            updateNoteMutation.mutate({ id, content: text });
          }}
          onDeleteNote={id => {
            deleteNoteMutation.mutate(id);
          }}
        />
      ) : (
        isClientOwner(dialog.owner) &&
        dialog.owner.machineId && (
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
        )
      )}

      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-h-[500px]">
        {/* Tab bar — visible only on mobile/tablet */}
        <Tabs value={activeChatTab} onValueChange={setActiveChatTab} className="lg:hidden mb-2">
          <TabsList className="w-full">
            {!isAdminOwner && (
              <TabsTrigger value="client" className="flex-1">
                Client Chat
              </TabsTrigger>
            )}
            <TabsTrigger value="technician" className="flex-1">
              Technician Chat
            </TabsTrigger>
            {version === 'v2' && (
              <TabsTrigger value="info" className="flex-1">
                Ticket Details
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {/* Ticket Details panel — visible only on mobile when info tab active */}
        {version === 'v2' && activeChatTab === 'info' && (
          <div className="lg:hidden flex-1 min-h-0 overflow-auto">
            <TicketInfoSection
              organization={{
                name:
                  dialog.organizationName ||
                  (isClientOwner(dialog.owner) ? dialog.owner.machine?.organizationId : undefined) ||
                  'Unassigned',
              }}
              user="Unassigned"
              device={{
                name:
                  dialog.deviceHostname ||
                  (isClientOwner(dialog.owner)
                    ? dialog.owner.machine?.hostname || dialog.owner.machine?.displayName
                    : undefined) ||
                  'Unassigned',
                icon: <Monitor className="size-4" />,
                onClick: deviceMachineId ? () => router.push(`/devices/details/${deviceMachineId}`) : undefined,
              }}
              statusTag={getTicketStatusTag(dialog.status)}
              expanded={true}
              assigned={{ name: dialog.assignedName || 'Unassigned' }}
              createdAt={dialog.createdAt ? new Date(dialog.createdAt).toLocaleString() : undefined}
              description={dialog.description || dialog.title || ''}
              attachments={uiAttachments}
              tags={(dialog.labels || []).map(l => l.name)}
              knowledgeBaseArticles={[]}
              notes={uiNotes}
              onAddNote={text => {
                if (dialog?.id) addNoteMutation.mutate({ ticketId: dialog.id, content: text });
              }}
              onEditNote={(id, text) => {
                updateNoteMutation.mutate({ id, content: text });
              }}
              onDeleteNote={id => {
                deleteNoteMutation.mutate(id);
              }}
            />
          </div>
        )}

        {/* Chat panels — tabs on mobile, side-by-side on desktop */}
        <div
          className={cn('flex-1 flex flex-col lg:flex-row gap-6 min-h-0', activeChatTab === 'info' && 'hidden lg:flex')}
        >
          {/* Client Chat — hidden for admin-owned tickets */}
          {!isAdminOwner && (
            <div
              className={cn(
                'flex-1 lg:basis-1/2 min-w-0 flex flex-col gap-1 min-h-0',
                activeChatTab !== 'client' ? 'hidden lg:flex' : 'flex',
              )}
            >
              <h2 className="hidden lg:block text-h5 text-ods-text-secondary">Client Chat</h2>
              {/* Messages card */}
              <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
                <ChatMessageList
                  messages={clientChatMessages}
                  dialogId={dialogId}
                  autoScroll={true}
                  showAvatars={false}
                  isLoading={clientChat.isLoading}
                  isTyping={isClientChatTyping}
                  pendingApprovals={chatData.pendingApprovals}
                  assistantType={chatData.assistantType}
                  hasNextPage={clientChat.hasNextPage}
                  isFetchingNextPage={clientChat.isFetchingNextPage}
                  onLoadMore={clientChat.fetchNextPage}
                />
              </div>

              {/* Direct Chat: Start button or ChatInput */}
              {version === 'v2' && !isDirectMode && (
                <button
                  type="button"
                  onClick={startDirectChat}
                  disabled={isStartingDirectChat}
                  className="w-full flex items-center justify-center gap-2 bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors mt-1"
                >
                  <ChatsIcon size={24} className="text-ods-text-primary shrink-0" />
                  <span className="text-h3 text-ods-text-primary">
                    {isStartingDirectChat ? 'Starting...' : 'Start Direct Chat'}
                  </span>
                </button>
              )}
              {version === 'v2' && isDirectMode && (
                <ChatInput
                  reserveAvatarOffset={false}
                  placeholder="Enter your Message..."
                  onSend={sendClientMessage}
                  sending={isSendingClientMessage}
                  autoFocus={false}
                  className="mt-1 bg-ods-card rounded-lg max-w-full"
                />
              )}
            </div>
          )}

          {/* Technician Chat */}
          <div
            className={cn(
              'flex-1 lg:basis-1/2 min-w-0 flex flex-col gap-1 min-h-0',
              activeChatTab !== 'technician' ? 'hidden lg:flex' : 'flex',
            )}
          >
            <h2 className="hidden lg:block text-h5 text-ods-text-secondary">Technician Chat</h2>
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
                  dialogId={dialogId}
                  autoScroll={true}
                  showAvatars={false}
                  isLoading={adminChat.isLoading}
                  isTyping={isAdminChatTyping}
                  pendingApprovals={adminChatData.pendingApprovals}
                  assistantType={adminChatData.assistantType}
                  hasNextPage={adminChat.hasNextPage}
                  isFetchingNextPage={adminChat.isFetchingNextPage}
                  onLoadMore={adminChat.fetchNextPage}
                />
              )}

              {/* Message Input */}
              <ChatInput
                reserveAvatarOffset={false}
                placeholder="Enter your Request..."
                onSend={handleSendAdminMessage}
                onStop={featureFlags.dialogStop.enabled() && isAdminChatTyping ? handleStopGeneration : undefined}
                sending={isSendingAdminMessage || isAdminChatTyping}
                autoFocus={false}
                className="mt-2 bg-ods-card rounded-lg max-w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
