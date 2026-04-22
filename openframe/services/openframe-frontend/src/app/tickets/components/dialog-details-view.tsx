'use client';

import {
  ActionsMenu,
  type ActionsMenuGroup,
  Button,
  ChatInput,
  type Message as ChatMessage,
  ChatMessageList,
  LoadError,
  MessageCircleIcon,
  ModelDisplay,
  NotFoundError,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  ChatsIcon,
  CheckCircleIcon,
  Chevron02DownIcon,
  ClipboardListIcon,
  ComputerMouseIcon,
  HourglassClockIcon,
  MonitorIcon,
  PenEditIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DetailLoader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  PageLayout,
  TicketInfoSection,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAiModel } from '@/app/hooks/use-ai-model';
import { apiClient } from '@/lib/api-client';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useAuthStore } from '@/stores';
import { DeviceInfoSection } from '../../components/shared';
import { formatFileSize } from '../../devices/utils/file-manager-utils';
import {
  APPROVAL_STATUS,
  ASSISTANT_CONFIG,
  CHAT_TYPE,
  CREATION_SOURCE,
  DIALOG_STATUS,
  type NatsMessageType,
} from '../constants';
import { useApprovalRequests } from '../hooks/use-approval-requests';
import { useAssignTicket } from '../hooks/use-assign-ticket';
import { useChunkCatchup } from '../hooks/use-chunk-catchup';
import { useDialogStatus } from '../hooks/use-dialog-status';
import { useDialogVersion } from '../hooks/use-dialog-version';
import { useDirectChat } from '../hooks/use-direct-chat';
import { useHistoricalMessages } from '../hooks/use-historical-messages';
import { useNatsDialogSubscription } from '../hooks/use-nats-dialog-subscription';
import { useSendAdminMessage } from '../hooks/use-send-admin-message';
import { useSideChunkProcessor } from '../hooks/use-side-chunk-processor';
import { useStopGeneration } from '../hooks/use-stop-generation';
import { useDownloadTicketAttachment } from '../hooks/use-ticket-attachments';
import { useTicketMessages } from '../hooks/use-ticket-messages';
import { useAddTicketNote, useDeleteTicketNote, useUpdateTicketNote } from '../hooks/use-ticket-notes';
import { useAssigneeOptions } from '../hooks/use-ticket-options';
import { useDialogDetailsStore } from '../stores/dialog-details-store';
import type { ClientDialogOwner, DialogOwner } from '../types/dialog.types';
import { extractPendingApprovals, stripPendingApprovals } from '../utils/pending-approvals';

interface DialogDetailsViewProps {
  dialogId: string;
}

export function DialogDetailsView({ dialogId }: DialogDetailsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const version = useDialogVersion();
  const initialAiModel = useAiModel();
  const [currentClientModel, setCurrentClientModel] = useState<{ provider: string; displayName: string } | null>(null);
  const [currentAdminModel, setCurrentAdminModel] = useState<{ provider: string; displayName: string } | null>(null);
  const isClientOwner = useCallback((owner: ClientDialogOwner | DialogOwner): owner is ClientDialogOwner => {
    return owner != null && typeof owner === 'object' && 'machineId' in owner;
  }, []);

  const {
    currentDialog: dialog,
    isLoadingDialog: isLoading,
    dialogError,
    client,
    admin,
    fetchDialog,
    clearCurrent,
    updateDialogStatus,
    setAccumulatorCallbacks,
    updateApprovalStatusInMessages,
  } = useDialogDetailsStore();

  const { messages: clientMessages, isTyping: isClientChatTyping } = client;
  const { messages: adminMessages, isTyping: isAdminChatTyping } = admin;
  const isCompacting = client.isCompacting || admin.isCompacting;

  const currentUser = useAuthStore(state => state.user);

  const refetchDialog = useCallback(() => {
    fetchDialog(dialogId, version);
  }, [fetchDialog, dialogId, version]);
  const addNoteMutation = useAddTicketNote(refetchDialog);
  const updateNoteMutation = useUpdateTicketNote(refetchDialog);
  const deleteNoteMutation = useDeleteTicketNote(refetchDialog);

  const { download: downloadAttachment } = useDownloadTicketAttachment();
  const assignTicketMutation = useAssignTicket(refetchDialog);
  const assigneeOptions = useAssigneeOptions();

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
      authorAvatar: getFullImageUrl(note.authorImageUrl),
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

  const { putOnHold, resolve, activate, archive, isUpdating } = useDialogStatus();
  const { handleApproveRequest, handleRejectRequest } = useApprovalRequests();
  const [isTicketInfoExpanded, setIsTicketInfoExpanded] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState('client');
  const hasCaughtUp = useRef(false);

  const clientDisplayName =
    dialog?.deviceHostname ||
    (dialog?.owner && isClientOwner(dialog.owner) ? dialog.owner.machine?.hostname : undefined) ||
    undefined;

  const processClientChunk = useSideChunkProcessor('client', {
    assistantName: ASSISTANT_CONFIG.FAE.name,
    assistantType: ASSISTANT_CONFIG.FAE.type,
    userDisplayName: clientDisplayName,
    onMetadata: useCallback((metadata: { modelDisplayName: string; providerName: string }) => {
      setCurrentClientModel({ provider: metadata.providerName, displayName: metadata.modelDisplayName });
    }, []),
  });

  const processAdminChunk = useSideChunkProcessor('admin', {
    assistantName: ASSISTANT_CONFIG.MINGO.name,
    assistantType: ASSISTANT_CONFIG.MINGO.type,
    onMetadata: useCallback((metadata: { modelDisplayName: string; providerName: string }) => {
      setCurrentAdminModel({ provider: metadata.providerName, displayName: metadata.modelDisplayName });
    }, []),
  });

  const dispatchChunk = useCallback(
    (chunk: unknown, messageType: NatsMessageType) => {
      if (messageType === 'admin-message') processAdminChunk(chunk);
      else processClientChunk(chunk);
    },
    [processClientChunk, processAdminChunk],
  );

  const { catchUpChunks, processChunk, resetChunkTracking, startInitialBuffering, resetAndCatchUp } = useChunkCatchup({
    dialogId: messageDialogId ?? '',
    onChunkReceived: dispatchChunk,
  });

  const { stopGeneration: handleStopGeneration } = useStopGeneration(messageDialogId);

  const { sendAdminMessage: handleSendAdminMessage, isSendingAdminMessage } = useSendAdminMessage({
    ticketId: dialogId,
    messageDialogId,
    version,
    onBeforeDialogCreated: () => {
      resetChunkTracking();
      startInitialBuffering();
      hasCaughtUp.current = false;
    },
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

  useEffect(() => {
    if (!initialAiModel) return;
    setCurrentClientModel(prev => prev ?? initialAiModel);
    setCurrentAdminModel(prev => prev ?? initialAiModel);
  }, [initialAiModel]);

  // Default to technician tab when ticket is admin-owned (no client chat)
  useEffect(() => {
    if (dialog?.owner?.type === 'ADMIN' && activeChatTab === 'client') {
      setActiveChatTab('technician');
    }
  }, [dialog?.owner?.type, activeChatTab]);

  // NATS subscription
  const handleNatsEvent = useCallback(
    (payload: unknown, messageType: NatsMessageType) => {
      processChunk(payload as any, messageType as 'message' | 'admin-message');
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

    const nextStatus = await putOnHold(dialogId);
    if (nextStatus) {
      updateDialogStatus(nextStatus);
    }
  }, [dialog, isUpdating, putOnHold, dialogId, updateDialogStatus]);

  const handleResolve = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const nextStatus = await resolve(dialogId);
    if (nextStatus) {
      updateDialogStatus(nextStatus);
    }
  }, [dialog, isUpdating, resolve, dialogId, updateDialogStatus]);

  const handleArchive = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const nextStatus = await archive(dialogId);
    if (nextStatus) {
      updateDialogStatus(nextStatus);
    }
  }, [dialog, isUpdating, archive, dialogId, updateDialogStatus]);

  const handleUnarchive = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const nextStatus = await activate(dialogId);
    if (nextStatus) {
      updateDialogStatus(nextStatus);
    }
  }, [dialog, isUpdating, activate, dialogId, updateDialogStatus]);

  const handleApprovalAction = useCallback(
    async (requestId: string | undefined, approving: boolean) => {
      if (!requestId) return;
      const mutate = approving ? handleApproveRequest : handleRejectRequest;
      const status = approving ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
      try {
        await mutate(requestId);
        updateApprovalStatusInMessages('client', requestId, status);
        updateApprovalStatusInMessages('admin', requestId, status);
      } catch (error) {
        toast({
          title: approving ? 'Approval Failed' : 'Rejection Failed',
          description:
            error instanceof Error
              ? error.message
              : approving
                ? 'Unable to approve request'
                : 'Unable to reject request',
          variant: 'destructive',
          duration: 5000,
        });
      }
    },
    [handleApproveRequest, handleRejectRequest, toast, updateApprovalStatusInMessages],
  );

  const handleApprove = useCallback(
    (requestId?: string) => handleApprovalAction(requestId, true),
    [handleApprovalAction],
  );
  const handleReject = useCallback(
    (requestId?: string) => handleApprovalAction(requestId, false),
    [handleApprovalAction],
  );

  useEffect(() => {
    setAccumulatorCallbacks('client', { onApprove: handleApprove, onReject: handleReject });
    setAccumulatorCallbacks('admin', { onApprove: handleApprove, onReject: handleReject });
  }, [handleApprove, handleReject, setAccumulatorCallbacks]);

  useHistoricalMessages({
    side: 'client',
    messageDialogId,
    chatType: CHAT_TYPE.CLIENT,
    assistantConfig: ASSISTANT_CONFIG.FAE,
    pages: clientChat.rawPages,
    isFetched: clientChat.isFetched,
    onApprove: handleApprove,
    onReject: handleReject,
  });
  useHistoricalMessages({
    side: 'admin',
    messageDialogId,
    chatType: CHAT_TYPE.ADMIN,
    assistantConfig: ASSISTANT_CONFIG.MINGO,
    pages: adminChat.rawPages,
    isFetched: adminChat.isFetched,
    onApprove: handleApprove,
    onReject: handleReject,
  });

  const clientPendingApprovals = useMemo(() => extractPendingApprovals(clientMessages), [clientMessages]);
  const adminPendingApprovals = useMemo(() => extractPendingApprovals(adminMessages), [adminMessages]);

  const remapClientUserName = useCallback(
    (msg: ChatMessage): ChatMessage =>
      msg.authorType === 'user' && clientDisplayName ? { ...msg, name: clientDisplayName } : msg,
    [clientDisplayName],
  );

  const clientChatMessages = useMemo(() => {
    const visible = stripPendingApprovals(clientMessages).map(remapClientUserName);
    if (dialog?.creationSource !== CREATION_SOURCE.FAE_FORM || clientChat.hasNextPage) {
      return visible;
    }
    const faeMessage: ChatMessage = {
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
      role: 'assistant',
      name: ASSISTANT_CONFIG.FAE.name,
      assistantType: ASSISTANT_CONFIG.FAE.type,
      authorType: 'fae',
      timestamp: new Date(dialog.createdAt),
    };
    return [faeMessage, ...visible];
  }, [clientMessages, remapClientUserName, dialog, clientChat.hasNextPage]);

  const adminChatDisplayMessages = useMemo(() => stripPendingApprovals(adminMessages), [adminMessages]);

  const [actionsOpen, setActionsOpen] = useState(false);

  const headerActions = useMemo(() => {
    if (!dialog) return null;

    const isResolved = dialog.status === DIALOG_STATUS.RESOLVED;
    const isArchived = dialog.status === DIALOG_STATUS.ARCHIVED;
    const isOnHold = dialog.status === DIALOG_STATUS.ON_HOLD;
    const isClosed = isResolved || isArchived;
    const machineId = dialog.deviceId || (isClientOwner(dialog.owner) ? dialog.owner.machineId : undefined);

    const menuGroups: ActionsMenuGroup[] = [
      {
        items: [
          ...(featureFlags.tickets.enabled() && !isArchived
            ? [
                {
                  id: 'edit-ticket',
                  label: 'Edit Ticket',
                  icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: () => {
                    setActionsOpen(false);
                    router.push(`/tickets/new?edit=${dialog.id}`);
                  },
                },
              ]
            : []),
          ...(!isOnHold && !isClosed
            ? [
                {
                  id: 'put-on-hold',
                  label: 'Put On Hold',
                  icon: <HourglassClockIcon className="w-6 h-6 text-ods-text-secondary" />,
                  disabled: isUpdating,
                  onClick: () => {
                    setActionsOpen(false);
                    handlePutOnHold();
                  },
                },
              ]
            : []),
        ],
        separator: true,
      },
      ...(machineId
        ? [
            {
              items: [
                {
                  id: 'device-details',
                  label: 'Device Details',
                  icon: <MonitorIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: () => {
                    setActionsOpen(false);
                    router.push(`/devices/details/${machineId}`);
                  },
                },
                {
                  id: 'remote-shell',
                  label: 'Remote Shell',
                  icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: () => {
                    setActionsOpen(false);
                    router.push(`/devices/details/${machineId}/remote-shell`);
                  },
                },
                {
                  id: 'remote-control',
                  label: 'Remote Control',
                  icon: <ComputerMouseIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: () => {
                    setActionsOpen(false);
                    router.push(`/devices/details/${machineId}/remote-desktop`);
                  },
                },
                {
                  id: 'device-logs',
                  label: 'Device Logs',
                  icon: <ClipboardListIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: () => {
                    setActionsOpen(false);
                    router.push(`/devices/details/${machineId}?tab=logs`);
                  },
                },
              ],
            },
          ]
        : []),
    ];

    return (
      <div className="flex gap-4 items-center">
        <DropdownMenu modal={false} open={actionsOpen} onOpenChange={setActionsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              rightIcon={<Chevron02DownIcon className="h-5 w-5 text-ods-text-primary ml-2" />}
              className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            >
              <span className="text-h3 text-ods-text-primary">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-0 border-none">
            <ActionsMenu groups={menuGroups} onItemClick={() => setActionsOpen(false)} />
          </DropdownMenuContent>
        </DropdownMenu>

        {!isClosed && (
          <Button
            variant="ghost"
            className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            leftIcon={<CheckCircleIcon className="h-6 w-6 text-ods-text-secondary" />}
            onClick={handleResolve}
            disabled={isUpdating}
          >
            <span className="text-h3 text-ods-text-primary">{isUpdating ? 'Updating...' : 'Resolve'}</span>
          </Button>
        )}

        {isResolved && (
          <Button
            variant="ghost"
            className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            leftIcon={<BoxArchiveIcon className="h-6 w-6 text-ods-text-secondary" />}
            onClick={handleArchive}
            disabled={isUpdating}
          >
            <span className="text-h3 text-ods-text-primary">{isUpdating ? 'Updating...' : 'Archive Ticket'}</span>
          </Button>
        )}

        {isArchived && (
          <Button
            variant="ghost"
            className="bg-ods-card border border-ods-border rounded-md px-4 py-3 hover:bg-ods-bg-hover transition-colors"
            leftIcon={<BoxArchiveIcon className="h-6 w-6 text-ods-text-secondary" />}
            onClick={handleUnarchive}
            disabled={isUpdating}
          >
            <span className="text-h3 text-ods-text-primary">{isUpdating ? 'Updating...' : 'Unarchive Ticket'}</span>
          </Button>
        )}
      </div>
    );
  }, [
    dialog,
    isUpdating,
    actionsOpen,
    isClientOwner,
    handlePutOnHold,
    handleResolve,
    handleArchive,
    handleUnarchive,
    router,
  ]);

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
  const isResolved = dialog.status === DIALOG_STATUS.RESOLVED;
  const isArchived = dialog.status === DIALOG_STATUS.ARCHIVED;
  const isClosed = isResolved || isArchived;
  const deviceMachineId = dialog.deviceId || (isClientOwner(dialog.owner) ? dialog.owner.machineId : undefined);
  const clientTokenUsage = dialog.tokenUsage?.find(t => t.chatType === CHAT_TYPE.CLIENT);
  const adminTokenUsage = dialog.tokenUsage?.find(t => t.chatType === CHAT_TYPE.ADMIN);
  const showTokenMemory = !isClosed && featureFlags.tokenBasedMemory.enabled();

  return (
    <PageLayout
      title={dialog.title || 'Untitled Dialog'}
      backButton={{
        label: 'Back to Tickets',
        onClick: () => router.push('/tickets'),
      }}
      padding="none"
      className="h-[calc(100%)]"
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
            imageSrc: getFullImageUrl(dialog.organizationImageUrl),
          }}
          user="Unassigned"
          device={{
            name:
              dialog.deviceHostname ||
              (isClientOwner(dialog.owner)
                ? dialog.owner.machine?.hostname || dialog.owner.machine?.displayName
                : undefined) ||
              'Unassigned',
            icon: <MonitorIcon className="size-4" />,
            onClick: deviceMachineId ? () => router.push(`/devices/details/${deviceMachineId}`) : undefined,
          }}
          status={dialog.status}
          onExpand={() => setIsTicketInfoExpanded(prev => !prev)}
          expanded={isTicketInfoExpanded}
          assigned={{
            currentAssignee: dialog.assignedName
              ? {
                  id: dialog.assignedTo!,
                  name: dialog.assignedName,
                  avatarSrc: getFullImageUrl(dialog.assigneeImageUrl),
                }
              : undefined,
            options: assigneeOptions.options.map(o => ({
              ...o,
              imageUrl: getFullImageUrl(o.imageUrl),
            })),
            isLoading: assigneeOptions.isLoading,
            isPending: assignTicketMutation.isPending,
            onAssign: userId => assignTicketMutation.mutate({ ticketId: dialog.id, assigneeId: userId }),
          }}
          createdAt={dialog.createdAt ? new Date(dialog.createdAt).toLocaleString() : undefined}
          description={dialog.description || dialog.title || ''}
          attachments={uiAttachments}
          tags={(dialog.labels || []).map(l => l.key)}
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
                imageSrc: getFullImageUrl(dialog.organizationImageUrl),
              }}
              user="Unassigned"
              device={{
                name:
                  dialog.deviceHostname ||
                  (isClientOwner(dialog.owner)
                    ? dialog.owner.machine?.hostname || dialog.owner.machine?.displayName
                    : undefined) ||
                  'Unassigned',
                icon: <MonitorIcon className="size-4" />,
                onClick: deviceMachineId ? () => router.push(`/devices/details/${deviceMachineId}`) : undefined,
              }}
              status={dialog.status}
              expanded={true}
              assigned={{
                currentAssignee: dialog.assignedName
                  ? {
                      id: dialog.assignedTo!,
                      name: dialog.assignedName,
                      avatarSrc: getFullImageUrl(dialog.assigneeImageUrl),
                    }
                  : undefined,
                options: assigneeOptions.options.map(o => ({
                  ...o,
                  imageUrl: getFullImageUrl(o.imageUrl),
                })),
                isLoading: assigneeOptions.isLoading,
                isPending: assignTicketMutation.isPending,
                onAssign: userId => assignTicketMutation.mutate({ ticketId: dialog.id, assigneeId: userId }),
              }}
              createdAt={dialog.createdAt ? new Date(dialog.createdAt).toLocaleString() : undefined}
              description={dialog.description || dialog.title || ''}
              attachments={uiAttachments}
              tags={(dialog.labels || []).map(l => l.key)}
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
                  pendingApprovals={clientPendingApprovals}
                  assistantType={ASSISTANT_CONFIG.FAE.type}
                  hasNextPage={clientChat.hasNextPage}
                  isFetchingNextPage={clientChat.isFetchingNextPage}
                  onLoadMore={clientChat.fetchNextPage}
                  contentClassName="px-4 max-w-full"
                />
              </div>

              {/* Direct Chat: Start button or ChatInput */}
              {!isClosed && version === 'v2' && !isDirectMode && (
                <button
                  type="button"
                  onClick={startDirectChat}
                  disabled={isStartingDirectChat}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-ods-card border border-ods-border px-3 py-3 transition-colors hover:bg-ods-bg-hover disabled:opacity-50 disabled:cursor-not-allowed mt-1 text-ods-text-primary"
                >
                  <ChatsIcon size={24} className="shrink-0 text-ods-text-secondary" />
                  <span className="text-h4">{isStartingDirectChat ? 'Starting...' : 'Start Direct Chat'}</span>
                </button>
              )}
              {!isClosed && version === 'v2' && isDirectMode && (
                <ChatInput
                  reserveAvatarOffset={false}
                  placeholder="Enter your Message..."
                  onSend={sendClientMessage}
                  sending={isSendingClientMessage}
                  autoFocus={false}
                  className="mt-1 bg-ods-card rounded-lg max-w-full"
                />
              )}
              {showTokenMemory && (currentClientModel || clientTokenUsage) && (
                <div className="mt-2">
                  <ModelDisplay
                    provider={currentClientModel?.provider}
                    modelName={currentClientModel?.displayName}
                    usedTokens={clientTokenUsage?.totalTokensSize ?? undefined}
                    contextWindow={clientTokenUsage?.contextSize ?? undefined}
                  />
                </div>
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
                  messages={adminChatDisplayMessages}
                  dialogId={dialogId}
                  autoScroll={true}
                  showAvatars={false}
                  isLoading={adminChat.isLoading}
                  isTyping={isAdminChatTyping}
                  pendingApprovals={adminPendingApprovals}
                  assistantType={ASSISTANT_CONFIG.MINGO.type}
                  hasNextPage={adminChat.hasNextPage}
                  isFetchingNextPage={adminChat.isFetchingNextPage}
                  onLoadMore={adminChat.fetchNextPage}
                  contentClassName="px-4 max-w-full"
                />
              )}

              {/* Message Input */}
              {!isClosed && (
                <ChatInput
                  reserveAvatarOffset={false}
                  placeholder="Enter your Request..."
                  onSend={handleSendAdminMessage}
                  onStop={
                    featureFlags.dialogStop.enabled() && isAdminChatTyping && adminPendingApprovals.length === 0
                      ? handleStopGeneration
                      : undefined
                  }
                  sending={isSendingAdminMessage || isAdminChatTyping || isCompacting || isClientChatTyping}
                  autoFocus={false}
                  className="mt-2 bg-ods-card rounded-lg max-w-full"
                />
              )}
              {showTokenMemory && (currentAdminModel || adminTokenUsage) && (
                <div className="mt-2">
                  <ModelDisplay
                    provider={currentAdminModel?.provider}
                    modelName={currentAdminModel?.displayName}
                    usedTokens={adminTokenUsage?.totalTokensSize ?? undefined}
                    contextWindow={adminTokenUsage?.contextSize ?? undefined}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
