'use client';

import {
  ChatInput,
  type Message as ChatMessage,
  ChatMessageList,
  LoadError,
  MessageCircleIcon,
  ModelDisplay,
  maxPersistedStreamSeq,
  NotFoundError,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { useOptionalTimeTracker } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  BoxArchiveIcon,
  ChatsIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockHistoryIcon,
  HourglassClockIcon,
  Menu02Icon,
  MonitorIcon,
  PenEditIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ActionsMenuGroup,
  type ActionsMenuItem,
  Button,
  InfoSection,
  type InfoSectionRow,
  NoData,
  type PageActionButton,
  PageLayout,
  resolveStatusTagProps,
  SimpleMarkdownRenderer,
  type TabItem,
  TabNavigation,
  TicketInfoSection,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-relay';
import type { startTimerMutation as StartTimerMutationType } from '@/__generated__/startTimerMutation.graphql';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { useAiModel } from '@/app/hooks/use-ai-model';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { AssignedItemsView, useAssignedItems } from '@/components/assignments';
import { startTimerMutation } from '@/graphql/time-tracker/start-timer-mutation';
import { makeSetCurrentTimerUpdater, toTicketGlobalId } from '@/graphql/time-tracker/time-tracker-helpers';
import { EVENT_SUBTYPE, type EventSubtype, trackDashboardActivity } from '@/lib/analytics';
import { extractPendingApprovals, findLatestPendingApprovalId, stripPendingApprovals } from '@/lib/chat-history';
import { featureFlags } from '@/lib/feature-flags';
import { formatDateTime } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import { routes } from '@/lib/routes';
import { useAuthStore } from '@/stores';
import { useDeviceActionsMenu } from '../../devices/hooks/use-device-actions-menu';
import { useDeviceDetails } from '../../devices/hooks/use-device-details';
import { formatFileSize } from '../../devices/utils/file-manager-utils';
import { CONTEXT_ENTITY_KIND } from '../../mingo/context/context-types';
import { useTrackOpenView } from '../../mingo/context/use-track-open-view';
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
import { useDirectChat } from '../hooks/use-direct-chat';
import { useHistoricalMessages } from '../hooks/use-historical-messages';
import { useSendAdminMessage } from '../hooks/use-send-admin-message';
import { useSideChunkProcessor } from '../hooks/use-side-chunk-processor';
import { useStopGeneration } from '../hooks/use-stop-generation';
import { useDownloadTicketAttachment } from '../hooks/use-ticket-attachments';
import { useTicketDetail } from '../hooks/use-ticket-detail';
import { useTicketMessages } from '../hooks/use-ticket-messages';
import { useAddTicketNote, useDeleteTicketNote, useUpdateTicketNote } from '../hooks/use-ticket-notes';
import { useAssigneeOptions } from '../hooks/use-ticket-options';
import { useTicketStatus } from '../hooks/use-ticket-status';
import { useTransitionTicket } from '../hooks/use-transition-ticket';
import { useTicketDetailsStore } from '../stores/ticket-details-store';
import type { ClientDialogOwner, Dialog, DialogOwner } from '../types/dialog.types';
import { ticketsQueryKeys } from '../utils/query-keys';
import { TICKET_STATUS_KIND } from '../utils/ticket-statistics';
import { TicketAttachmentsSection } from './ticket-attachments-section';
import { TicketDetailsSkeleton } from './ticket-details-skeleton';
import { TicketDialogSubscription } from './ticket-dialog-subscription';
import { TicketNotesSection } from './ticket-notes-section';
import { TicketTagsSection } from './ticket-tags-section';

interface TicketDetailsViewProps {
  ticketId: string;
}

/**
 * Wrap a device-menu item so opening it also fires a dashboard-activity event.
 * `href` navigation is preserved. For a submenu parent the click only expands
 * the submenu, so tracking is attached to the leaf items that actually
 * navigate, not the parent.
 */
function withActivityTracking(item: ActionsMenuItem, subtype: EventSubtype): ActionsMenuItem {
  if (item.submenu && item.submenu.length > 0) {
    return { ...item, submenu: item.submenu.map(child => withActivityTracking(child, subtype)) };
  }
  const originalOnClick = item.onClick;
  return {
    ...item,
    onClick: () => {
      trackDashboardActivity(subtype);
      originalOnClick?.();
    },
  };
}

export function TicketDetailsView({ ticketId }: TicketDetailsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handleBackToTickets = useSafeBack(routes.tickets.list);
  const { toast } = useToast();
  // When the Mingo sidebar carries per-ticket context, the embedded technician
  // (Mingo) chat is redundant: its panel, NATS subscription, history fetch, and
  // chunk processing are all dropped in favor of the global sidebar chat.
  const isTechnicianChatEnabled = !featureFlags.mingoSidebarContext.enabled();
  const isSidebarLayout = !isTechnicianChatEnabled;
  const assignedItems = useAssignedItems({ itemId: ticketId, itemType: 'TICKET', enabled: isSidebarLayout });
  const initialAiModel = useAiModel();
  const [currentClientModel, setCurrentClientModel] = useState<{ provider: string; displayName: string } | null>(null);
  const [currentAdminModel, setCurrentAdminModel] = useState<{ provider: string; displayName: string } | null>(null);
  const isClientOwner = useCallback((owner: ClientDialogOwner | DialogOwner): owner is ClientDialogOwner => {
    return owner != null && typeof owner === 'object' && 'machineId' in owner;
  }, []);

  const queryClient = useQueryClient();
  const { ticket: dialog, isPending: isLoading, error: dialogError } = useTicketDetail(ticketId);

  // Register the open ticket as the Mingo "open view" so it rides on the sidebar
  // chat's context. `dialog.id` is the raw db id the backend TICKET resolver /
  // `@ticket:id` marker expects (TICKET is REST-resolved — no global-id round-trip).
  useTrackOpenView(
    dialog ? { type: CONTEXT_ENTITY_KIND.TICKET, id: dialog.id, label: dialog.title || dialog.id } : null,
  );

  // Device referenced by the ticket. Same hook & availability utility used by
  // the Devices view, so remote-action gating stays in sync across views.
  const machineId = useMemo(() => {
    if (!dialog) return undefined;
    // owner.machineId is the canonical machineId; dialog.deviceId is a backend passthrough
    // that may contain a Mongo ObjectId, so prefer the owner field when available.
    const ownerMachineId = isClientOwner(dialog.owner) ? dialog.owner.machineId : undefined;
    return ownerMachineId || dialog.deviceId;
  }, [dialog, isClientOwner]);
  const { deviceDetails, isLoading: isDeviceLoading } = useDeviceDetails(machineId);
  const { items: deviceMenuItems } = useDeviceActionsMenu(deviceDetails, { deviceId: machineId });

  const {
    client,
    admin,
    clearChatState,
    setAccumulatorCallbacks,
    updateApprovalStatusInMessages,
    recordHighestStreamSeq,
  } = useTicketDetailsStore();
  const approvalStatuses = useTicketDetailsStore(s => s.approvalStatuses);

  const { messages: clientMessages, isTyping: isClientChatTyping } = client;
  const { messages: adminMessages, isTyping: isAdminChatTyping } = admin;

  const isClientCompacting = useMemo(() => {
    const lastMsg = clientMessages.at(-1);
    if (lastMsg?.role !== 'assistant' || !Array.isArray(lastMsg.content)) return false;
    const tail = lastMsg.content.at(-1);
    return tail?.type === 'context_compaction' && tail.status === 'started';
  }, [clientMessages]);

  const isAdminCompacting = useMemo(() => {
    const lastMsg = adminMessages.at(-1);
    if (lastMsg?.role !== 'assistant' || !Array.isArray(lastMsg.content)) return false;
    const tail = lastMsg.content.at(-1);
    return tail?.type === 'context_compaction' && tail.status === 'started';
  }, [adminMessages]);

  const isCompacting = isClientCompacting || isAdminCompacting;

  const currentUser = useAuthStore(state => state.user);

  const refetchDialog = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.detail(ticketId) });
  }, [queryClient, ticketId]);
  const addNoteMutation = useAddTicketNote(ticketId);
  const updateNoteMutation = useUpdateTicketNote(ticketId);
  const deleteNoteMutation = useDeleteTicketNote(ticketId);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleConfirmDeleteNote = useCallback(() => {
    if (!noteToDelete) return;
    deleteNoteMutation.mutate(noteToDelete, {
      onSuccess: () => setNoteToDelete(null),
    });
  }, [deleteNoteMutation, noteToDelete]);

  const { download: downloadAttachment } = useDownloadTicketAttachment();
  const assignTicketMutation = useAssignTicket();
  const assigneeOptions = useAssigneeOptions();

  const { isDirectMode, isStartingDirectChat, isSendingClientMessage, startDirectChat, sendClientMessage } =
    useDirectChat({
      ticketId,
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
      authorAvatar: getFullImageUrl(note.authorImageUrl, note.authorImageHash),
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

  // The URL param is the ticket ID; messages belong to the linked dialog
  const messageDialogId = dialog?.dialogId ?? null;

  const clientChat = useTicketMessages(messageDialogId, CHAT_TYPE.CLIENT);
  const adminChat = useTicketMessages(isTechnicianChatEnabled ? messageDialogId : null, CHAT_TYPE.ADMIN);

  const { activate, archive, isUpdating } = useTicketStatus();
  const transitionTicket = useTransitionTicket();
  const { handleApproveRequest, handleRejectRequest } = useApprovalRequests();

  // Time tracker lives in a global host provider (mounted when the feature flag
  // is on). Starting here writes the running timer into the Relay store, which
  // the host's CurrentTimer hydrator reads — so the global panel reflects it.
  const timeTracker = useOptionalTimeTracker();
  const [startTimer, isStartingTimer] = useMutation<StartTimerMutationType>(startTimerMutation);
  const handleStartTimeTracking = useCallback(() => {
    if (!dialog) return;
    startTimer({
      variables: { input: { ticketId: toTicketGlobalId(dialog.id), notes: null } },
      updater: makeSetCurrentTimerUpdater('startTimer'),
      onCompleted: () => {
        toast({
          title: 'Time tracking started',
          description: 'A timer is now running for this ticket.',
          variant: 'success',
        });
      },
      onError: err => {
        toast({ title: 'Failed to start timer', description: err.message, variant: 'destructive' });
      },
    });
  }, [dialog, startTimer, toast]);
  const [isTicketInfoExpanded, setIsTicketInfoExpanded] = useState<boolean | null>(null);
  const defaultTicketInfoExpanded =
    dialog?.creationSource === CREATION_SOURCE.FAE_FORM || dialog?.creationSource === CREATION_SOURCE.ADMIN_DASHBOARD;
  const ticketInfoExpanded = isTicketInfoExpanded ?? defaultTicketInfoExpanded;
  const [activeChatTab, setActiveChatTab] = useState('client');
  const mainTab = searchParams.get('tab') === 'chat' ? 'chat' : 'details';
  const handleMainTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clientDisplayName =
    dialog?.deviceHostname ||
    (dialog?.owner && isClientOwner(dialog.owner) ? dialog.owner.machine?.hostname : undefined) ||
    undefined;

  const processClientChunk = useSideChunkProcessor('client', {
    assistantName: ASSISTANT_CONFIG.FAE.name,
    assistantType: ASSISTANT_CONFIG.FAE.type,
    userDisplayName: clientDisplayName,
    isDirectMode,
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
      const isAdmin = messageType === 'admin-message';
      const seq = (chunk as { streamSeq?: number }).streamSeq;
      if (typeof seq === 'number') recordHighestStreamSeq(isAdmin ? 'admin' : 'client', seq);
      if (isAdmin) processAdminChunk(chunk);
      else processClientChunk(chunk);
    },
    [processClientChunk, processAdminChunk, recordHighestStreamSeq],
  );

  const { stopGeneration: handleStopGeneration } = useStopGeneration(messageDialogId);

  const { sendAdminMessage: rawSendAdminMessage, isSendingAdminMessage } = useSendAdminMessage({
    ticketId,
    messageDialogId,
  });

  // Sending while an approval is pending is an interrupt — backend cancels
  // it and emits APPROVAL_RESULT (rejected) shortly. Flipping the latest
  // pending approval on the same side optimistically resolves the card in
  // the same frame as the user-message bubble, eliminating the flicker
  // between the user's send and the backend's resolution chunk.
  const sendClientMessageWithReject = useCallback(
    (text: string) => {
      const pendingId = findLatestPendingApprovalId(clientMessages);
      if (pendingId) updateApprovalStatusInMessages('client', pendingId, 'rejected');
      return sendClientMessage(text);
    },
    [sendClientMessage, clientMessages, updateApprovalStatusInMessages],
  );

  const handleSendAdminMessage = useCallback(
    (text: string) => {
      const pendingId = findLatestPendingApprovalId(adminMessages);
      if (pendingId) updateApprovalStatusInMessages('admin', pendingId, 'rejected');
      return rawSendAdminMessage(text);
    },
    [rawSendAdminMessage, adminMessages, updateApprovalStatusInMessages],
  );

  useEffect(() => {
    if (!ticketId) return;

    return () => {
      clearChatState();
    };
  }, [ticketId, clearChatState]);

  useEffect(() => {
    if (!initialAiModel) return;
    setCurrentClientModel(prev => prev ?? initialAiModel);
    setCurrentAdminModel(prev => prev ?? initialAiModel);
  }, [initialAiModel]);

  // Admin-owned tickets have no client chat, so the default 'client' tab is
  // empty. Redirect to the technician chat when it's available, otherwise to
  // ticket details (the only remaining tab).
  useEffect(() => {
    if (dialog?.owner?.type !== 'ADMIN' || activeChatTab !== 'client') return;
    setActiveChatTab(isTechnicianChatEnabled ? 'technician' : 'info');
  }, [dialog?.owner?.type, activeChatTab, isTechnicianChatEnabled]);

  const clientInitialOptStartSeq = useMemo(() => maxPersistedStreamSeq(clientChat.rawPages), [clientChat.rawPages]);
  const adminInitialOptStartSeq = useMemo(() => maxPersistedStreamSeq(adminChat.rawPages), [adminChat.rawPages]);
  const isInitialOptStartSeqReady = clientChat.isFetched && (!isTechnicianChatEnabled || adminChat.isFetched);

  const applyStatus = useCallback(
    (nextStatus: Dialog['status']) => {
      queryClient.setQueryData<Dialog | null>(ticketsQueryKeys.detail(ticketId), prev =>
        prev ? { ...prev, status: nextStatus } : prev,
      );
    },
    [queryClient, ticketId],
  );

  const handleArchive = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const nextStatus = await archive(ticketId);
    if (nextStatus) applyStatus(nextStatus);
  }, [dialog, isUpdating, archive, ticketId, applyStatus]);

  const handleUnarchive = useCallback(async () => {
    if (!dialog || isUpdating) return;

    const nextStatus = await activate(ticketId);
    if (nextStatus) applyStatus(nextStatus);
  }, [dialog, isUpdating, activate, ticketId, applyStatus]);

  const handleTransition = useCallback(
    (toStatusId: string) => {
      if (!dialog || transitionTicket.isPending) return;
      transitionTicket.mutate({ ticketId, toStatusId });
    },
    [dialog, ticketId, transitionTicket],
  );

  const handleApprovalAction = useCallback(
    async (requestId: string | undefined, approving: boolean) => {
      if (!requestId) return;
      const mutate = approving ? handleApproveRequest : handleRejectRequest;
      const status = approving ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
      // Optimistic flip *before* the network round-trip. Backend starts
      // streaming continuation chunks immediately on approval; if we wait
      // for the mutation, the incoming MESSAGE_START adopts the still-
      // pending bubble and text chunks overwrite the approval card.
      updateApprovalStatusInMessages('client', requestId, status);
      updateApprovalStatusInMessages('admin', requestId, status);
      try {
        await mutate(requestId);
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
    dataUpdatedAt: clientChat.dataUpdatedAt,
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
    dataUpdatedAt: adminChat.dataUpdatedAt,
    isFetched: adminChat.isFetched,
    onApprove: handleApprove,
    onReject: handleReject,
  });

  const clientPendingApprovals = useMemo(
    () => extractPendingApprovals(clientMessages, approvalStatuses),
    [clientMessages, approvalStatuses],
  );
  const adminPendingApprovals = useMemo(
    () => extractPendingApprovals(adminMessages, approvalStatuses),
    [adminMessages, approvalStatuses],
  );

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

  const menuActions = useMemo<ActionsMenuGroup[]>(() => {
    if (!dialog) return [];

    const isArchived = dialog.status === DIALOG_STATUS.ARCHIVED;

    const ticketItems: ActionsMenuItem[] = [];
    const infoItems: ActionsMenuItem[] = [];
    const remoteItems: ActionsMenuItem[] = [];

    if (!isArchived) {
      ticketItems.push({
        id: 'edit-ticket',
        label: 'Edit Ticket',
        icon: <PenEditIcon className="text-ods-text-secondary" />,
        onClick: () => router.push(routes.tickets.new({ edit: dialog.id })),
      });
    }

    if (deviceDetails || isDeviceLoading) {
      infoItems.push(deviceMenuItems.deviceDetails, deviceMenuItems.deviceLogs);
      remoteItems.push(
        withActivityTracking(deviceMenuItems.remoteShell, EVENT_SUBTYPE.OPEN_REMOTE_SHELL),
        withActivityTracking(deviceMenuItems.remoteControl, EVENT_SUBTYPE.OPEN_REMOTE_CONTROL),
        deviceMenuItems.manageFiles,
        deviceMenuItems.runScript,
      );
    }

    const groups: ActionsMenuGroup[] = [];
    const candidates = [ticketItems, infoItems, remoteItems];
    candidates.forEach((items, idx) => {
      if (items.length === 0) return;
      const hasMore = candidates.slice(idx + 1).some(g => g.length > 0);
      groups.push({ items, separator: hasMore });
    });
    return groups;
  }, [dialog, deviceDetails, isDeviceLoading, deviceMenuItems, router]);

  const pageActions = useMemo<PageActionButton[]>(() => {
    if (!dialog) return [];

    const isResolved = dialog.status === DIALOG_STATUS.RESOLVED;
    const isArchived = dialog.status === DIALOG_STATUS.ARCHIVED;
    const actions: PageActionButton[] = [];

    if (isResolved) {
      actions.push({
        label: isUpdating ? 'Updating...' : 'Archive Ticket',
        variant: 'outline',
        icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
        onClick: handleArchive,
        disabled: isUpdating,
      });
    }

    if (isArchived) {
      actions.push({
        label: isUpdating ? 'Updating...' : 'Unarchive Ticket',
        variant: 'outline',
        icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
        onClick: handleUnarchive,
        disabled: isUpdating,
      });
    }

    return actions;
  }, [dialog, isUpdating, handleArchive, handleUnarchive]);

  if (isLoading) {
    return <TicketDetailsSkeleton onBack={handleBackToTickets} showTechnicianChat={isTechnicianChatEnabled} />;
  }

  if (dialogError) {
    return <LoadError message={`Error loading ticket: ${dialogError.message}`} />;
  }

  if (!dialog) {
    return <NotFoundError message="Ticket not found" />;
  }

  const isAdminOwner = dialog.owner?.type === 'ADMIN';
  const isResolved = dialog.status === DIALOG_STATUS.RESOLVED;
  const isArchived = dialog.status === DIALOG_STATUS.ARCHIVED;
  const isClosed = isResolved || isArchived;
  const clientTokenUsage = dialog.tokenUsage?.find(t => t.chatType === CHAT_TYPE.CLIENT);
  const adminTokenUsage = dialog.tokenUsage?.find(t => t.chatType === CHAT_TYPE.ADMIN);
  const showTokenMemory = !isClosed;

  // The status tag is an inline changer driven by the ticket's available
  // transitions. resolveStatusTagProps applies the
  // unified design (AI_ASSISTANCE/RESOLVED → canonical styling like the board;
  // TECH_REQUIRED and custom → backend color), shared with the chat surfaces.
  const statusTag = resolveStatusTagProps({
    status: dialog.statusId ?? dialog.status,
    statusKind: dialog.statusKind,
    statusName: dialog.statusName,
    statusColor: dialog.statusColor,
  });
  const statusInfoProps = {
    status: statusTag.status,
    statusLabel: statusTag.label,
    statusColor: statusTag.color,
    statusOptions: dialog.availableTransitions,
    onStatusSelect: handleTransition,
    isStatusPending: transitionTicket.isPending,
  };

  const hasClientChat = !isAdminOwner;
  const hasDescription = !!dialog.description?.trim();
  const hasAssignedItems = !!(
    assignedItems.customers?.length ||
    assignedItems.devices?.length ||
    assignedItems.articles?.length ||
    assignedItems.tickets?.length
  );
  const hasTicketDetails = hasDescription || hasAssignedItems;
  const showDetailsTabs = hasClientChat && hasTicketDetails;
  const customerName =
    dialog.organizationName ||
    (isClientOwner(dialog.owner) ? dialog.owner.machine?.organizationId : undefined) ||
    undefined;

  const infoRows: InfoSectionRow[] = [
    {
      id: 'customer',
      label: 'Customer',
      value: customerName
        ? {
            text: customerName,
            imageSrc: getFullImageUrl(dialog.organizationImageUrl, dialog.organizationImageHash),
            imageFallback: customerName,
          }
        : { text: '—' },
    },
    {
      id: 'device',
      label: 'Device',
      value: {
        text:
          dialog.deviceHostname ||
          (isClientOwner(dialog.owner)
            ? dialog.owner.machine?.hostname || dialog.owner.machine?.displayName
            : undefined) ||
          '—',
        href: machineId ? routes.devices.details(machineId) : undefined,
      },
    },
    {
      id: 'assigned',
      label: 'Assigned',
      value: {
        type: 'assignee',
        currentAssignee: dialog.assignedName
          ? {
              id: dialog.assignedTo!,
              name: dialog.assignedName,
              avatarSrc: getFullImageUrl(dialog.assigneeImageUrl, dialog.assigneeImageHash),
            }
          : undefined,
        options: assigneeOptions.options.map(o => ({ ...o, imageUrl: getFullImageUrl(o.imageUrl) })),
        isLoading: assigneeOptions.isLoading,
        isPending: assignTicketMutation.isPending,
        onAssign: userId => assignTicketMutation.mutate({ ticketId: dialog.id, assigneeId: userId }),
      },
    },
    {
      id: 'created',
      label: 'Created',
      value: { text: dialog.createdAt ? formatDateTime(dialog.createdAt) : 'Unknown' },
    },
    {
      id: 'status',
      label: 'Status',
      value: {
        type: 'status',
        status: statusTag.status,
        label: statusTag.label,
        color: statusTag.color,
        options: dialog.availableTransitions,
        onSelect: handleTransition,
        isPending: transitionTicket.isPending,
      },
    },
  ];

  // Time tracking only applies to tickets that have reached a human-handled
  // status (tech-required or a custom lifecycle status); it's hidden for
  // AI-assistance, resolved, and archived tickets. Once a timer is running the
  // button disables — only one timer can be active at a time.
  const canTrackTime =
    featureFlags.timeTracker.enabled() &&
    (dialog.statusKind === TICKET_STATUS_KIND.TECH_REQUIRED || dialog.statusKind === TICKET_STATUS_KIND.CUSTOM);
  const isTimerActive = (timeTracker?.status ?? 'ready') !== 'ready';

  const sidebarActions: PageActionButton[] = [];
  if (!isArchived) {
    sidebarActions.push({
      label: 'Edit Ticket',
      ariaLabel: 'Edit Ticket',
      variant: 'outline',
      icon: <PenEditIcon className="text-ods-text-secondary" />,
      onClick: () => router.push(routes.tickets.new({ edit: dialog.id })),
      iconOnlyOnDesktop: true,
    });
  }
  if (canTrackTime) {
    sidebarActions.push({
      label: 'Track Time',
      ariaLabel: 'Track time for this ticket',
      tooltip: 'Track time for this ticket',
      variant: 'outline',
      icon: <ClockHistoryIcon className="text-ods-text-secondary" />,
      onClick: handleStartTimeTracking,
      disabled: isTimerActive || isStartingTimer,
      iconOnlyOnDesktop: true,
    });
  }
  const sidebarMenuItems: ActionsMenuItem[] = menuActions
    .flatMap(group => group.items)
    .filter(item => item.id !== 'edit-ticket');
  if (isResolved) {
    sidebarMenuItems.push({
      id: 'archive',
      label: isUpdating ? 'Updating...' : 'Archive Ticket',
      icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
      onClick: handleArchive,
      disabled: isUpdating,
    });
  }
  if (isArchived) {
    sidebarMenuItems.push({
      id: 'unarchive',
      label: isUpdating ? 'Updating...' : 'Unarchive Ticket',
      icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
      onClick: handleUnarchive,
      disabled: isUpdating,
    });
  }
  if (sidebarMenuItems.length > 0) {
    sidebarActions.push({ label: 'Actions', ariaLabel: 'Actions', submenu: sidebarMenuItems });
  }

  const clientChatBody = (
    <>
      <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
        <ChatMessageList
          messages={clientChatMessages}
          dialogId={ticketId}
          autoScroll={true}
          showAvatars={false}
          isLoading={clientChat.isLoading}
          isTyping={isClientChatTyping}
          pendingApprovals={clientPendingApprovals}
          assistantType={ASSISTANT_CONFIG.FAE.type}
          hasNextPage={clientChat.hasNextPage}
          isFetchingNextPage={clientChat.isFetchingNextPage}
          onLoadMore={clientChat.fetchNextPage}
          contentClassName="px-[var(--spacing-system-mf)] !max-w-full"
        />
      </div>

      {!isClosed && !isDirectMode && (
        <div className="mt-[var(--spacing-system-xsf)] flex items-start gap-[var(--spacing-system-m)]">
          <p className="flex-1 min-w-0 text-h6 text-ods-text-secondary">
            The AI assistant will be stopped and you will be able to communicate with the user directly.
          </p>
          <Button
            variant="outline"
            onClick={startDirectChat}
            disabled={isStartingDirectChat}
            leftIcon={<ChatsIcon size={24} className="text-ods-text-secondary" />}
            className="shrink-0"
          >
            {isStartingDirectChat ? 'Starting...' : 'Start Direct Chat'}
          </Button>
        </div>
      )}
      {!isClosed && isDirectMode && (
        <ChatInput
          placeholder="Enter your Message..."
          onSend={sendClientMessageWithReject}
          sending={isSendingClientMessage || isClientChatTyping || isClientCompacting}
          autoFocus={false}
          className="mt-[var(--spacing-system-xsf)] bg-ods-card rounded-lg !max-w-full"
        />
      )}
      {showTokenMemory && (currentClientModel || clientTokenUsage) && (
        <div className="mt-[var(--spacing-system-xsf)]">
          <ModelDisplay
            provider={currentClientModel?.provider}
            modelName={currentClientModel?.displayName}
            usedTokens={clientTokenUsage?.totalTokensSize ?? undefined}
            contextWindow={clientTokenUsage?.contextSize ?? undefined}
          />
        </div>
      )}
    </>
  );

  const mainTabs: TabItem[] = [
    { id: 'details', label: 'Ticket Details', icon: ClipboardListIcon },
    { id: 'chat', label: 'Client Chat', icon: ChatsIcon },
  ];

  // Ticket Details pane (description + assigned items) — shared by the tabbed and
  // the standalone (no-tabs) layouts.
  const ticketDetailsBody = (
    <>
      {hasDescription ? (
        <section className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <p className="text-h5 text-ods-text-secondary">Ticket Description</p>
          <div className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-mf)]">
            <SimpleMarkdownRenderer content={dialog.description ?? ''} />
          </div>
        </section>
      ) : (
        // No description: show the empty state only when there's nothing else in
        // the pane (assigned items render on their own when present).
        !hasAssignedItems && (
          <NoData icon={<Menu02Icon />} title="No Description" description="This ticket has no description added yet" />
        )
      )}
      {hasAssignedItems && (
        <section className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <p className="text-h5 text-ods-text-secondary">Assigned Items</p>
          <AssignedItemsView showTitle={false} itemId={dialog.id} itemType="TICKET" />
        </section>
      )}
    </>
  );

  // Ticket info / attachments / tags — the right sidebar on desktop, folded into
  // the Ticket Details tab on tablet/mobile.
  const sidebarContent = (
    <>
      <InfoSection title="Ticket Details" rows={infoRows} />
      <TicketAttachmentsSection ticketId={dialog.id} attachments={dialog.attachments ?? []} />
      <TicketTagsSection ticketId={dialog.id} labels={dialog.labels ?? []} />
      <TicketNotesSection
        notes={uiNotes}
        isAddingNote={addNoteMutation.isPending}
        onAddNote={text => addNoteMutation.mutate({ content: text })}
        onEditNote={(id, text) => updateNoteMutation.mutate({ id, content: text })}
        onDeleteNote={setNoteToDelete}
      />
    </>
  );

  return (
    <>
      <TicketDialogSubscription
        dialogId={messageDialogId}
        dispatchChunk={dispatchChunk}
        clientInitialOptStartSeq={clientInitialOptStartSeq}
        adminInitialOptStartSeq={adminInitialOptStartSeq}
        isInitialOptStartSeqReady={isInitialOptStartSeqReady}
        subscribeAdmin={isTechnicianChatEnabled}
      />
      {isSidebarLayout ? (
        <PageLayout
          title={dialog.title || 'Untitled Dialog'}
          backButton={{ label: 'Back', onClick: handleBackToTickets }}
          className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] h-[calc(100%)]"
          actions={sidebarActions}
          actionsVariant="icon-buttons"
          contentClassName="flex flex-col min-h-0"
        >
          <div className="flex-1 flex flex-col lg:flex-row gap-[var(--spacing-system-l)] min-h-0">
            {/* Desktop (lg+): main pane (tabs / chat / details) beside a persistent details sidebar */}
            <div className="hidden lg:flex flex-1 min-w-0 flex-col gap-[var(--spacing-system-xxs)] min-h-0">
              {showDetailsTabs ? (
                <TabNavigation tabs={mainTabs} activeTab={mainTab} onTabChange={handleMainTabChange}>
                  {active =>
                    active === 'chat' ? (
                      <div className="flex-1 min-h-0 flex flex-col pt-[var(--spacing-system-mf)]">{clientChatBody}</div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--spacing-system-l)] pt-[var(--spacing-system-mf)]">
                        {ticketDetailsBody}
                      </div>
                    )
                  }
                </TabNavigation>
              ) : hasClientChat ? (
                <>
                  <h2 className="text-h5 text-ods-text-secondary">Client Chat</h2>
                  {clientChatBody}
                </>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--spacing-system-l)]">
                  {ticketDetailsBody}
                </div>
              )}
            </div>

            {/* Tablet/mobile (<lg): single column — ticket info/attachments/tags fold into the
                Ticket Details tab; the client chat (when present) gets its own tab without them. */}
            <div className="flex lg:hidden flex-1 min-w-0 flex-col gap-[var(--spacing-system-xxs)] min-h-0">
              {hasClientChat ? (
                <TabNavigation tabs={mainTabs} activeTab={mainTab} onTabChange={handleMainTabChange}>
                  {active =>
                    active === 'chat' ? (
                      <div className="flex-1 min-h-0 flex flex-col pt-[var(--spacing-system-mf)]">{clientChatBody}</div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--spacing-system-l)] pt-[var(--spacing-system-mf)]">
                        {ticketDetailsBody}
                        {sidebarContent}
                      </div>
                    )
                  }
                </TabNavigation>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[var(--spacing-system-l)]">
                  {ticketDetailsBody}
                  {sidebarContent}
                </div>
              )}
            </div>

            {/* Right sidebar — desktop only */}
            <aside className="hidden lg:flex shrink-0 lg:w-80 flex-col gap-[var(--spacing-system-l)] min-h-0 lg:overflow-auto">
              {sidebarContent}
            </aside>
          </div>
        </PageLayout>
      ) : (
        <PageLayout
          title={dialog.title || 'Untitled Dialog'}
          backButton={{
            label: 'Back',
            onClick: handleBackToTickets,
          }}
          className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] h-[calc(100%)]"
          actions={pageActions}
          actionsVariant="menu-primary"
          menuActions={menuActions}
          contentClassName="flex flex-col min-h-0"
        >
          <TicketInfoSection
            className="hidden lg:block shrink-0"
            organization={{
              name:
                dialog.organizationName ||
                (isClientOwner(dialog.owner) ? dialog.owner.machine?.organizationId : undefined) ||
                'Unassigned',
              imageSrc: getFullImageUrl(dialog.organizationImageUrl, dialog.organizationImageHash),
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
              onClick: machineId ? () => router.push(routes.devices.details(machineId)) : undefined,
            }}
            {...statusInfoProps}
            onExpand={() => setIsTicketInfoExpanded(!ticketInfoExpanded)}
            expanded={ticketInfoExpanded}
            assigned={{
              currentAssignee: dialog.assignedName
                ? {
                    id: dialog.assignedTo!,
                    name: dialog.assignedName,
                    avatarSrc: getFullImageUrl(dialog.assigneeImageUrl, dialog.assigneeImageHash),
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
            createdAt={dialog.createdAt ? formatDateTime(dialog.createdAt) : undefined}
            description={dialog.description || dialog.title || ''}
            attachments={uiAttachments}
            tags={(dialog.labels || []).map(l => l.key)}
            notes={uiNotes}
            isAddingNote={addNoteMutation.isPending}
            onAddNote={text => {
              if (dialog?.id) addNoteMutation.mutate({ content: text });
            }}
            onEditNote={(id, text) => {
              updateNoteMutation.mutate({ id, content: text });
            }}
            onDeleteNote={setNoteToDelete}
          />
          {ticketInfoExpanded && (
            <AssignedItemsView
              itemId={dialog.id}
              itemType="TICKET"
              className="hidden lg:block shrink-0 mt-[var(--spacing-system-mf)]"
            />
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
                {isTechnicianChatEnabled && (
                  <TabsTrigger value="technician" className="flex-1">
                    Technician Chat
                  </TabsTrigger>
                )}
                <TabsTrigger value="info" className="flex-1">
                  Ticket Details
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Ticket Details panel — visible only on mobile when info tab active */}
            {activeChatTab === 'info' && (
              <div className="lg:hidden flex-1 min-h-0 overflow-auto">
                <TicketInfoSection
                  organization={{
                    name:
                      dialog.organizationName ||
                      (isClientOwner(dialog.owner) ? dialog.owner.machine?.organizationId : undefined) ||
                      'Unassigned',
                    imageSrc: getFullImageUrl(dialog.organizationImageUrl, dialog.organizationImageHash),
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
                    onClick: machineId ? () => router.push(routes.devices.details(machineId)) : undefined,
                  }}
                  {...statusInfoProps}
                  expanded={true}
                  assigned={{
                    currentAssignee: dialog.assignedName
                      ? {
                          id: dialog.assignedTo!,
                          name: dialog.assignedName,
                          avatarSrc: getFullImageUrl(dialog.assigneeImageUrl, dialog.assigneeImageHash),
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
                  createdAt={dialog.createdAt ? formatDateTime(dialog.createdAt) : undefined}
                  description={dialog.description || dialog.title || ''}
                  attachments={uiAttachments}
                  tags={(dialog.labels || []).map(l => l.key)}
                  notes={uiNotes}
                  onAddNote={text => {
                    if (dialog?.id) addNoteMutation.mutate({ content: text });
                  }}
                  onEditNote={(id, text) => {
                    updateNoteMutation.mutate({ id, content: text });
                  }}
                  onDeleteNote={setNoteToDelete}
                />
                <AssignedItemsView itemId={dialog.id} itemType="TICKET" className="mt-[var(--spacing-system-mf)]" />
              </div>
            )}

            {/* Chat panels — tabs on mobile, side-by-side on desktop */}
            <div
              className={cn(
                'flex-1 flex flex-col lg:flex-row gap-6 min-h-0',
                activeChatTab === 'info' && 'hidden lg:flex',
              )}
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
                      dialogId={ticketId}
                      autoScroll={true}
                      showAvatars={false}
                      isLoading={clientChat.isLoading}
                      isTyping={isClientChatTyping}
                      pendingApprovals={clientPendingApprovals}
                      assistantType={ASSISTANT_CONFIG.FAE.type}
                      hasNextPage={clientChat.hasNextPage}
                      isFetchingNextPage={clientChat.isFetchingNextPage}
                      onLoadMore={clientChat.fetchNextPage}
                      contentClassName="px-[var(--spacing-system-mf)] !max-w-full"
                    />
                  </div>

                  {/* Direct Chat: Start button or ChatInput */}
                  {!isClosed && !isDirectMode && (
                    <button
                      type="button"
                      onClick={startDirectChat}
                      disabled={isStartingDirectChat}
                      className="w-full flex items-center justify-center gap-[var(--spacing-system-xsf)] rounded-lg bg-ods-card border border-ods-border px-[var(--spacing-system-sf)] py-[var(--spacing-system-sf)] transition-colors hover:bg-ods-bg-hover disabled:opacity-50 disabled:cursor-not-allowed mt-[var(--spacing-system-xsf)] text-ods-text-primary"
                    >
                      <ChatsIcon size={24} className="shrink-0 text-ods-text-secondary" />
                      <span className="text-h4">{isStartingDirectChat ? 'Starting...' : 'Start Direct Chat'}</span>
                    </button>
                  )}
                  {!isClosed && isDirectMode && (
                    <ChatInput
                      placeholder="Enter your Message..."
                      onSend={sendClientMessageWithReject}
                      sending={isSendingClientMessage || isClientChatTyping || isClientCompacting}
                      autoFocus={false}
                      className="mt-[var(--spacing-system-xsf)] bg-ods-card rounded-lg !max-w-full"
                    />
                  )}
                  {showTokenMemory && (currentClientModel || clientTokenUsage) && (
                    <div className="mt-[var(--spacing-system-xsf)]">
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
              {isTechnicianChatEnabled && (
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
                        dialogId={ticketId}
                        autoScroll={true}
                        showAvatars={false}
                        isLoading={adminChat.isLoading}
                        isTyping={isAdminChatTyping}
                        pendingApprovals={adminPendingApprovals}
                        assistantType={ASSISTANT_CONFIG.MINGO.type}
                        hasNextPage={adminChat.hasNextPage}
                        isFetchingNextPage={adminChat.isFetchingNextPage}
                        onLoadMore={adminChat.fetchNextPage}
                        contentClassName="px-[var(--spacing-system-mf)] !max-w-full"
                      />
                    )}
                  </div>

                  {!isClosed && (
                    <ChatInput
                      placeholder="Enter your Request..."
                      onSend={handleSendAdminMessage}
                      onStop={isAdminChatTyping ? handleStopGeneration : undefined}
                      sending={isSendingAdminMessage || isAdminChatTyping || isCompacting || isClientChatTyping}
                      autoFocus={false}
                      className="mt-[var(--spacing-system-xsf)] bg-ods-card rounded-lg !max-w-full"
                    />
                  )}
                  {showTokenMemory && (currentAdminModel || adminTokenUsage) && (
                    <div className="mt-[var(--spacing-system-xsf)]">
                      <ModelDisplay
                        provider={currentAdminModel?.provider}
                        modelName={currentAdminModel?.displayName}
                        usedTokens={adminTokenUsage?.totalTokensSize ?? undefined}
                        contextWindow={adminTokenUsage?.contextSize ?? undefined}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </PageLayout>
      )}

      <ConfirmDialog
        open={noteToDelete !== null}
        onOpenChange={open => {
          if (!open) setNoteToDelete(null);
        }}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete Note"
        pendingLabel="Deleting..."
        variant="destructive"
        isPending={deleteNoteMutation.isPending}
        onConfirm={handleConfirmDeleteNote}
      />
    </>
  );
}
