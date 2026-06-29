import {
  ActionsMenu,
  Button,
  ChatContainer,
  ChatContent,
  ChatFooter,
  ChatHeader,
  type ChatHeaderTicketInfo,
  ChatInput,
  ChatQuickActionRow,
  ChatQuickActionRowSkeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  type Message,
  type MessageSegment,
  ModelDisplay,
  ModelDisplaySkeleton,
  type TokenUsageData,
} from '@flamingo-stack/openframe-frontend-core';
import { Ellipsis01Icon, PlusCircleIcon, TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatDialogScreen } from '../components/ChatDialogScreen';
import { ChatInitialScreen } from '../components/ChatInitialScreen';
import { NewTicketModal } from '../components/NewTicketModal';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { useApplyAiAppearance } from '../hooks/useApplyAiAppearance';
import { useAssistantBranding } from '../hooks/useAssistantBranding';
import { useChat } from '../hooks/useChat';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useTenantInfoQuery } from '../hooks/useTenantInfoQuery';
import { type TicketDetails, useTickets } from '../hooks/useTickets';
import { useWelcomeScreen } from '../hooks/useWelcomeScreen';
import { type DialogTokenUsage, dialogGraphQlService } from '../services/dialogGraphQLService';
import { supportedModelsService } from '../services/supportedModelsService';
import { ticketGraphQlService } from '../services/ticketGraphQlService';
import { isTauri } from '../utils/runtime';

function toTokenUsageData(usage: DialogTokenUsage | null | undefined): TokenUsageData | null {
  if (!usage) return null;
  return {
    inputTokensSize: usage.inputTokensSize ?? 0,
    outputTokensSize: usage.outputTokensSize ?? 0,
    totalTokensSize: usage.totalTokensSize ?? 0,
    contextSize: usage.contextSize ?? 0,
  };
}

const STATUS_POLL_INTERVAL_MS = 15_000;

const isTerminalTicket = (t: { status?: string; statusKind?: string; dialogStatus?: string }) =>
  t.status === 'RESOLVED' ||
  t.statusKind === 'RESOLVED' ||
  t.statusKind === 'ARCHIVED' ||
  t.dialogStatus === 'RESOLVED' ||
  t.dialogStatus === 'ARCHIVED';

export function ChatView() {
  const queryClient = useQueryClient();

  const [currentModel, setCurrentModel] = useState<{
    modelName: string;
    provider: string;
    contextWindow: number;
  } | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageData | null>(null);
  const [faeFormTicket, setFaeFormTicket] = useState<{
    id: string;
    title: string;
    description?: string;
    createdAt: string;
  } | null>(null);
  const [previewTicketId, setPreviewTicketId] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isDialogClosed, setIsDialogClosed] = useState(false);
  const activeTicketIdRef = useRef<string | null>(null);
  activeTicketIdRef.current = activeTicketId;
  const { showWelcome, completeWelcome } = useWelcomeScreen();
  const { assistantName, assistantAvatar, isLoading: isAssistantLoading } = useAssistantBranding();
  useApplyAiAppearance();

  const handleTokenUsage = useCallback((data: TokenUsageData) => {
    setTokenUsage(data);
  }, []);

  const handleDialogClosed = useCallback(() => {
    setIsDialogClosed(true);
    const id = activeTicketIdRef.current;
    if (!id) return;
    queryClient.setQueryData<TicketDetails | null>(['active-ticket-state', id], prev =>
      prev
        ? {
            ...prev,
            status: 'RESOLVED',
            statusKind: 'RESOLVED',
            dialogStatus: 'RESOLVED',
            statusName: undefined,
            statusColor: undefined,
          }
        : prev,
    );
  }, [queryClient]);

  const handleDirectModeDetected = useCallback(() => {
    const id = activeTicketIdRef.current;
    if (!id) return;
    queryClient.setQueryData<TicketDetails | null>(['active-ticket-state', id], prev =>
      prev ? { ...prev, dialogMode: 'DIRECT' } : prev,
    );
  }, [queryClient]);

  const handleMetadataUpdate = useCallback(
    (metadata: { modelName: string; providerName: string; contextWindow: number }) => {
      setCurrentModel({
        modelName: metadata.modelName,
        provider: metadata.providerName,
        contextWindow: metadata.contextWindow,
      });
    },
    [],
  );

  const {
    messages,
    isTyping,
    isStreaming,
    isCompacting,
    sendMessage,
    stopGeneration,
    handleQuickAction,
    quickActions,
    isSettingsLoading,
    hasMessages,
    clearMessages,
    resumeDialog,
    showTicketPreview,
    isTicketPreview,
    awaitingTechnicianResponse,
    isLoadingHistory,
    dialogId,
    hasNextPage,
    isFetchingNextPage,
    loadMoreMessages,
  } = useChat({
    useApi: true,
    useNats: true,
    onMetadataUpdate: handleMetadataUpdate,
    onTokenUsage: handleTokenUsage,
    onDialogClosed: handleDialogClosed,
    onDirectModeDetected: handleDirectModeDetected,
  });

  const { toast } = useToast();

  const { status, aiConfiguration, isFullyLoaded } = useConnectionStatus();
  const isDisconnected = status !== 'connected';

  // Header shows the MSP company name (from tenant info) in place of the tenant domain.
  const { data: tenantInfo } = useTenantInfoQuery({ enabled: true });
  const mspCompanyName = tenantInfo?.name?.trim() || undefined;

  // Connected: fire-and-forget so ChatInput clears the draft immediately. Returning
  // sendMessage's promise would make the lib defer clearing until it resolves (once
  // the full response arrives), leaving the sent text in the input until then.
  // Disconnected: toast and return false so the lib keeps the user's draft instead
  // of clearing it on a send that can't go through.
  const handleSend = useCallback(
    (text: string) => {
      if (isDisconnected) {
        toast({
          title: 'Connection lost',
          description: 'Your message was not sent. Please try again shortly.',
          variant: 'destructive',
        });
        return false;
      }
      void sendMessage(text);
    },
    [sendMessage, isDisconnected, toast],
  );

  // Pre-process messages for rendering: filter pending approvals (they
  // render in the sticky footer), dedupe approval_request/approval_batch
  // segments across bubbles by requestId (first occurrence wins — agent
  // retries reuse the same id), and drop empty assistant bubbles that
  // held only filtered/deduped segments.
  const processedMessages = useMemo<Message[]>(() => {
    const seenApprovalIds = new Set<string>();
    const out: Message[] = [];
    for (const msg of messages) {
      if (!Array.isArray(msg.content)) {
        out.push(msg);
        continue;
      }
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

      if (msg.role === 'assistant' && filtered.length === 0) continue;
      out.push(filtered.length === msg.content.length ? msg : { ...msg, content: filtered });
    }
    return out;
  }, [messages]);

  const handleNewChat = useCallback(() => {
    setFaeFormTicket(null);
    setPreviewTicketId(null);
    setActiveTicketId(null);
    setIsDialogClosed(false);
    clearMessages();
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    setTokenUsage(null);
  }, [clearMessages, queryClient]);

  const ticketsHook = useTickets();

  const displayTickets = ticketsHook.tickets;

  const handleTicketClick = useCallback(
    async (ticketId: string) => {
      // Already viewing this dialog (e.g. clicking its own notification): the
      // live NATS subscription already holds the latest messages. Reloading
      // would clear them and fall back to stale cached history.
      const openDialogId = ticketsHook.getDialogId(ticketId);
      if (openDialogId && openDialogId === dialogId) return;

      setFaeFormTicket(null);
      setPreviewTicketId(null);
      setActiveTicketId(null);
      setIsDialogClosed(false);

      const ticketDetails = await queryClient.fetchQuery({
        queryKey: ['active-ticket-state', ticketId],
        queryFn: () => ticketsHook.getTicketDetails(ticketId),
        staleTime: STATUS_POLL_INTERVAL_MS,
      });
      if (!ticketDetails) {
        toast({
          title: 'Error',
          description: 'Failed to load ticket details',
          variant: 'destructive',
        });
        return;
      }

      setActiveTicketId(ticketId);

      if (!openDialogId) {
        setPreviewTicketId(ticketId);
        showTicketPreview(ticketDetails);
        return;
      }

      if (ticketDetails.creationSource === 'FAE_FORM') {
        setFaeFormTicket({
          id: ticketId,
          title: ticketDetails.title,
          description: ticketDetails.description,
          createdAt: ticketDetails.createdAt || new Date().toISOString(),
        });
      }

      await resumeDialog(openDialogId);
    },
    [ticketsHook, resumeDialog, showTicketPreview, toast, dialogId, queryClient],
  );

  useEffect(() => {
    if (!dialogId) return;
    if (tokenUsage) return;
    dialogGraphQlService.getDialogTokenUsage(dialogId).then(usage => {
      if (usage) setTokenUsage(toTokenUsageData(usage));
    });
  }, [dialogId, tokenUsage]);

  const { data: activeTicket } = useQuery({
    queryKey: ['active-ticket-state', activeTicketId],
    queryFn: async () => {
      if (!activeTicketId) return null;
      const fresh = await ticketsHook.getTicketDetails(activeTicketId);
      const current = queryClient.getQueryData<TicketDetails | null>(['active-ticket-state', activeTicketId]);
      if (current && isTerminalTicket(current) && fresh && !isTerminalTicket(fresh)) return current;
      return fresh;
    },
    enabled: !!activeTicketId && !isDialogClosed,
    refetchInterval: query =>
      query.state.data && isTerminalTicket(query.state.data) ? false : STATUS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: STATUS_POLL_INTERVAL_MS,
  });

  const isChatClosed = isDialogClosed || (!!activeTicket && isTerminalTicket(activeTicket));

  const isAwaitingTechnician =
    !isChatClosed &&
    !!activeTicket?.statusKind &&
    activeTicket.statusKind !== 'AI_ASSISTANCE' &&
    activeTicket.dialogMode !== 'DIRECT';

  const ticketInfo = useMemo<ChatHeaderTicketInfo | undefined>(() => {
    if (!activeTicket?.title || !hasMessages) return undefined;
    const metaParts = [activeTicket.ticketNumber, activeTicket.category, activeTicket.timeAgo].filter(Boolean);
    return {
      title: activeTicket.title,
      meta: metaParts.length > 0 ? metaParts.join(' • ') : undefined,
      status: activeTicket.status,
      statusName: activeTicket.statusName,
      statusColor: activeTicket.statusColor,
      statusKind: activeTicket.statusKind,
    };
  }, [activeTicket, hasMessages]);

  const displayModel =
    currentModel ||
    (aiConfiguration
      ? {
          modelName: aiConfiguration.modelName,
          provider: aiConfiguration.provider,
          contextWindow: 0,
        }
      : null);

  const displayMessages = useMemo(() => {
    if (!faeFormTicket || hasNextPage) return processedMessages;
    const faeMessage = {
      id: `synthetic-fae-form-${faeFormTicket.id}`,
      role: 'assistant' as const,
      name: assistantName,
      content: [
        'Your request has been received. We will contact you shortly.',
        '',
        'Subject:',
        faeFormTicket.title || '',
        '',
        'Description:',
        faeFormTicket.description || '(No description provided)',
      ].join('\n'),
      timestamp: new Date(faeFormTicket.createdAt),
      avatar: assistantAvatar,
    };
    return [faeMessage, ...processedMessages];
  }, [processedMessages, faeFormTicket, hasNextPage, assistantName, assistantAvatar]);

  useEffect(() => {
    if (!isTicketPreview || !previewTicketId) return;

    const interval = setInterval(async () => {
      try {
        const ticket = await ticketGraphQlService.getTicket(previewTicketId);
        if (ticket?.dialog?.id) {
          setPreviewTicketId(null);

          if (ticket.creationSource === 'FAE_FORM') {
            setFaeFormTicket({
              id: previewTicketId,
              title: ticket.title,
              description: ticket.description,
              createdAt: ticket.createdAt,
            });
          }

          await resumeDialog(ticket.dialog.id);
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isTicketPreview, previewTicketId, resumeDialog]);

  // Rust emits notification:click when the window gains focus shortly after a
  // NATS-driven OS notification; open the entity it came from. The ref keeps
  // the Tauri listener registered once instead of churning per render.
  const notificationClickRef = useRef({ handleTicketClick, resumeDialog, dialogId });
  notificationClickRef.current = { handleTicketClick, resumeDialog, dialogId };

  useEffect(() => {
    if (!isTauri) return;
    type NotificationClickPayload = { kind: string; id: string };
    const unlistenPromise = listen<NotificationClickPayload>('notification:click', event => {
      const { kind, id } = event.payload;
      if (!id) return;
      if (kind === 'ticket') {
        void notificationClickRef.current.handleTicketClick(id);
      } else if (kind === 'dialog') {
        const { resumeDialog, dialogId } = notificationClickRef.current;
        // Already viewing this dialog — the live subscription has the message.
        if (id !== dialogId) void resumeDialog(id);
      }
    });
    return () => {
      unlistenPromise.then(unlisten => unlisten()).catch(() => undefined);
    };
  }, []);

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={completeWelcome} />;
  }

  const isDialogActive = displayMessages.length > 0 || hasMessages || Boolean(dialogId && isLoadingHistory);

  return (
    <ChatContainer className="p-[var(--spacing-system-l)] pb-[var(--spacing-system-xs)]">
      <ChatHeader
        isLoading={isAssistantLoading}
        userName={assistantName}
        userAvatar={assistantAvatar}
        connectionStatus={status}
        serverUrl={mspCompanyName}
        onBack={hasMessages ? handleNewChat : undefined}
        ticketInfo={ticketInfo}
        headerActions={
          <>
            {!hasMessages && (
              <Button
                onClick={() => setIsTicketModalOpen(true)}
                variant="outline"
                leftIcon={<TagIcon className="w-5 h-5" color="var(--color-text-secondary)" />}
                className="border border-ods-border text-ods-text-primary hover:bg-ods-bg-hover"
              >
                Create Ticket
              </Button>
            )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border border-ods-border text-ods-text-primary hover:bg-ods-bg-hover"
                >
                  <Ellipsis01Icon className="w-5 h-5 text-ods-text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0 border-none">
                <ActionsMenu
                  groups={[
                    {
                      items: [
                        {
                          id: 'new-chat',
                          label: 'New Chat',
                          icon: <PlusCircleIcon className="w-6 h-6" color="var(--color-text-secondary)" />,
                          disabled: !hasMessages,
                          onClick: handleNewChat,
                        },
                      ],
                    },
                  ]}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <NewTicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} />

      <ChatContent className="pt-6 pb-4">
        {isDialogActive ? (
          <ChatDialogScreen
            messages={displayMessages}
            dialogId={dialogId || undefined}
            isTyping={isTyping}
            isLoadingHistory={isLoadingHistory}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={loadMoreMessages}
          />
        ) : (
          <ChatInitialScreen
            tickets={displayTickets}
            onTicketClick={handleTicketClick}
            isLoadingTickets={ticketsHook.isLoading}
          />
        )}
      </ChatContent>

      <ChatFooter>
        {isChatClosed ? (
          <p className="text-body2 text-ods-text-secondary text-center py-4">
            This chat is closed. If you have a similar problem, please create a new request.
          </p>
        ) : (
          <>
            {/* Quick-action chips above the composer — initial screen only.
                Skeleton while settings load (so we don't flash bundled defaults
                before the configured actions resolve), then the real row. */}
            {!isDialogActive && !isDisconnected && isSettingsLoading && (
              <ChatQuickActionRowSkeleton className="mb-[var(--spacing-system-s)]" />
            )}
            {!isDialogActive && !isDisconnected && !isSettingsLoading && quickActions.length > 0 && (
              <ChatQuickActionRow
                className="mb-[var(--spacing-system-s)]"
                chips={quickActions.map(action => ({
                  id: action.id,
                  label: action.name,
                  onSelect: () => handleQuickAction(action.instructions),
                }))}
              />
            )}
            <ChatInput
              onSend={handleSend}
              onStop={isStreaming ? stopGeneration : undefined}
              sending={isStreaming || isCompacting}
              awaitingResponse={isTicketPreview || awaitingTechnicianResponse || isAwaitingTechnician}
              placeholder="Enter your request here..."
            />
          </>
        )}
        {!isChatClosed && (!isFullyLoaded || displayModel || tokenUsage) && (
          <div className="mx-auto w-full max-w-ods-content-narrow mt-[var(--spacing-system-s)]">
            {!isFullyLoaded ? (
              // Model metadata still loading — placeholder so the footer doesn't shift.
              <ModelDisplaySkeleton />
            ) : (
              displayModel && (
                <ModelDisplay
                  provider={displayModel.provider}
                  modelName={displayModel.modelName}
                  displayName={supportedModelsService.getModelDisplayName(displayModel.modelName)}
                  usedTokens={tokenUsage?.totalTokensSize}
                  contextWindow={tokenUsage?.contextSize}
                />
              )
            )}
          </div>
        )}
      </ChatFooter>
    </ChatContainer>
  );
}
