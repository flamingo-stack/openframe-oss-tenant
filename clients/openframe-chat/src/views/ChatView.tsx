import {
  ActionsMenu,
  Button,
  ChatContainer,
  ChatContent,
  ChatFooter,
  ChatHeader,
  type ChatHeaderTicketInfo,
  ChatInput,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  type Message,
  type MessageSegment,
  ModelDisplay,
  type TokenUsageData,
} from '@flamingo-stack/openframe-frontend-core';
import { Ellipsis01Icon, PlusCircleIcon, TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import faeAvatar from '../assets/fae-avatar.png';
import { ChatDialogScreen } from '../components/ChatDialogScreen';
import { ChatInitialScreen } from '../components/ChatInitialScreen';
import { NewTicketModal } from '../components/NewTicketModal';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { useChat } from '../hooks/useChat';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useTickets } from '../hooks/useTickets';
import { useWelcomeScreen } from '../hooks/useWelcomeScreen';
import { type DialogTokenUsage, dialogGraphQlService } from '../services/dialogGraphQLService';
import { supportedModelsService } from '../services/supportedModelsService';
import { ticketGraphQlService } from '../services/ticketGraphQlService';

function toTokenUsageData(usage: DialogTokenUsage | null | undefined): TokenUsageData | null {
  if (!usage) return null;
  return {
    inputTokensSize: usage.inputTokensSize ?? 0,
    outputTokensSize: usage.outputTokensSize ?? 0,
    totalTokensSize: usage.totalTokensSize ?? 0,
    contextSize: usage.contextSize ?? 0,
  };
}

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
  const [activeTicket, setActiveTicket] = useState<{
    title?: string;
    ticketNumber?: string;
    category?: string;
    timeAgo?: string;
    status?: string;
  } | null>(null);
  const { showWelcome, completeWelcome } = useWelcomeScreen();

  const handleTokenUsage = useCallback((data: TokenUsageData) => {
    setTokenUsage(data);
  }, []);

  const handleDialogClosed = useCallback(() => {
    setActiveTicket(prev => (prev ? { ...prev, status: 'RESOLVED' } : { status: 'RESOLVED' }));
  }, []);

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
  });

  const { toast } = useToast();

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
    setActiveTicket(null);
    clearMessages();
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    setTokenUsage(null);
  }, [clearMessages, queryClient]);

  const ticketsHook = useTickets();

  const displayTickets = ticketsHook.tickets;

  const handleTicketClick = useCallback(
    async (ticketId: string) => {
      setFaeFormTicket(null);
      setPreviewTicketId(null);
      setActiveTicket(null);

      const ticketDetails = await ticketsHook.getTicketDetails(ticketId);
      if (!ticketDetails) {
        toast({
          title: 'Error',
          description: 'Failed to load ticket details',
          variant: 'destructive',
        });
        return;
      }

      setActiveTicket({
        title: ticketDetails.title,
        ticketNumber: ticketDetails.ticketNumber,
        category: ticketDetails.category,
        timeAgo: ticketDetails.timeAgo,
        status: ticketDetails.status,
      });

      const dialogId = ticketsHook.getDialogId(ticketId);
      if (!dialogId) {
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

      await resumeDialog(dialogId);
    },
    [ticketsHook, resumeDialog, showTicketPreview, toast],
  );

  useEffect(() => {
    if (!dialogId) return;
    if (tokenUsage) return;
    dialogGraphQlService.getDialogTokenUsage(dialogId).then(usage => {
      if (usage) setTokenUsage(toTokenUsageData(usage));
    });
  }, [dialogId, tokenUsage]);

  const { status, serverUrl, aiConfiguration, isFullyLoaded } = useConnectionStatus();
  const isDisconnected = status !== 'connected';

  const isActiveTicketResolved = activeTicket?.status === 'RESOLVED';

  const ticketInfo = useMemo<ChatHeaderTicketInfo | undefined>(() => {
    if (!activeTicket?.title || !hasMessages) return undefined;
    const metaParts = [activeTicket.ticketNumber, activeTicket.category, activeTicket.timeAgo].filter(Boolean);
    return {
      title: activeTicket.title,
      meta: metaParts.length > 0 ? metaParts.join(' • ') : undefined,
      status: activeTicket.status,
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
      name: 'Fae',
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
      avatar: faeAvatar,
    };
    return [faeMessage, ...processedMessages];
  }, [processedMessages, faeFormTicket, hasNextPage]);

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

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={completeWelcome} />;
  }

  const isDialogActive = displayMessages.length > 0 || hasMessages || Boolean(dialogId && isLoadingHistory);

  return (
    <ChatContainer className="p-[var(--spacing-system-l)] pb-[var(--spacing-system-xs)]">
      <ChatHeader
        userAvatar={faeAvatar}
        connectionStatus={status}
        serverUrl={serverUrl}
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

      <ChatContent>
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
            quickActions={quickActions}
            onQuickAction={handleQuickAction}
            isDisconnected={isDisconnected}
          />
        )}
      </ChatContent>

      <ChatFooter>
        {isActiveTicketResolved ? (
          <p className="text-body2 text-ods-text-secondary text-center py-4">
            This chat is closed. If you have a similar problem, please create a new request.
          </p>
        ) : (
          <ChatInput
            onSend={sendMessage}
            onStop={isStreaming ? stopGeneration : undefined}
            sending={isStreaming || isCompacting}
            awaitingResponse={isTicketPreview || awaitingTechnicianResponse}
            placeholder="Enter your request here..."
            disabled={isDisconnected}
          />
        )}
        {!isActiveTicketResolved && ((displayModel && isFullyLoaded) || tokenUsage) && (
          <div className="mx-auto w-full max-w-ods-content-narrow mt-[var(--spacing-system-sf)]">
            {displayModel && isFullyLoaded && (
              <ModelDisplay
                provider={displayModel.provider}
                modelName={displayModel.modelName}
                displayName={supportedModelsService.getModelDisplayName(displayModel.modelName)}
                usedTokens={tokenUsage?.totalTokensSize}
                contextWindow={tokenUsage?.contextSize}
              />
            )}
          </div>
        )}
      </ChatFooter>
    </ChatContainer>
  );
}
