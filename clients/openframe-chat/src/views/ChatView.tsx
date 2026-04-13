import {
  ActionsMenu,
  Button,
  ChatContainer,
  ChatContent,
  ChatFooter,
  ChatHeader,
  ChatInput,
  ChatMessageList,
  ChatQuickAction,
  ChatTicketList,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  ModelDisplay,
} from '@flamingo-stack/openframe-frontend-core';
import { ClockHistoryIcon, Ellipsis01Icon, PlusCircleIcon, TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import faeAvatar from '../assets/fae-avatar.png';
import { NewTicketModal } from '../components/NewTicketModal';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { useChat } from '../hooks/useChat';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useTickets } from '../hooks/useTickets';
import { useWelcomeScreen } from '../hooks/useWelcomeScreen';
import { dialogGraphQlService, type ResumableDialog } from '../services/dialogGraphQLService';
import { supportedModelsService } from '../services/supportedModelsService';
import { ticketGraphQlService } from '../services/ticketGraphQlService';

export function ChatView() {
  const { flags } = useFeatureFlags();

  const [currentModel, setCurrentModel] = useState<{
    modelName: string;
    provider: string;
    contextWindow: number;
  } | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [resumableDialog, setResumableDialog] = useState<ResumableDialog | null>(null);
  const [faeFormTicket, setFaeFormTicket] = useState<{
    id: string;
    title: string;
    description?: string;
    createdAt: string;
  } | null>(null);
  const [previewTicketId, setPreviewTicketId] = useState<string | null>(null);
  const { showWelcome, completeWelcome } = useWelcomeScreen();

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
  });

  const { toast } = useToast();

  const fetchResumableDialog = useCallback(() => {
    dialogGraphQlService.getResumableDialog().then(dialog => {
      setResumableDialog(dialog);
    });
  }, []);

  useEffect(() => {
    if (!flags.tickets) {
      fetchResumableDialog();
    }
  }, [flags.tickets, fetchResumableDialog]);

  const handleNewChat = useCallback(() => {
    setFaeFormTicket(null);
    setPreviewTicketId(null);
    clearMessages();
    if (!flags.tickets) {
      fetchResumableDialog();
    }
  }, [clearMessages, flags.tickets, fetchResumableDialog]);

  const ticketsHook = useTickets({ enabled: flags.tickets });

  const displayTickets = flags.tickets ? ticketsHook.tickets : [];

  const handleTicketClick = useCallback(
    async (ticketId: string) => {
      setFaeFormTicket(null);
      setPreviewTicketId(null);

      if (flags.tickets) {
        const dialogId = ticketsHook.getDialogId(ticketId);
        if (!dialogId) {
          const ticketDetails = await ticketsHook.getTicketDetails(ticketId);
          if (ticketDetails) {
            setPreviewTicketId(ticketId);
            showTicketPreview(ticketDetails);
          } else {
            toast({
              title: 'Error',
              description: 'Failed to load ticket details',
              variant: 'destructive',
            });
          }
          return;
        }

        if (ticketsHook.getCreationSource(ticketId) === 'FAE_FORM') {
          const ticketDetails = await ticketsHook.getTicketDetails(ticketId);
          if (ticketDetails) {
            setFaeFormTicket({
              id: ticketId,
              title: ticketDetails.title,
              description: ticketDetails.description,
              createdAt: ticketDetails.createdAt || new Date().toISOString(),
            });
          }
        }

        await resumeDialog(dialogId);
      } else {
        await resumeDialog(ticketId);
      }
    },
    [ticketsHook, resumeDialog, showTicketPreview, toast, flags],
  );

  const { status, serverUrl, aiConfiguration, isFullyLoaded } = useConnectionStatus();
  const isDisconnected = status !== 'connected';

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
    if (!faeFormTicket || hasNextPage) return messages;
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
    return [faeMessage, ...messages];
  }, [messages, faeFormTicket, hasNextPage]);

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

  return (
    <ChatContainer>
      <ChatHeader
        userAvatar={faeAvatar}
        connectionStatus={status}
        serverUrl={serverUrl}
        headerActions={
          <>
            {flags.tickets && (
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
                  centerIcon={<Ellipsis01Icon className="w-5 h-5" color="var(--color-text-secondary)" />}
                  className="border border-ods-border text-ods-text-primary hover:bg-ods-bg-hover"
                />
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
        {displayMessages.length > 0 || hasMessages || (dialogId && isLoadingHistory) ? (
          <ChatMessageList
            messages={displayMessages}
            dialogId={dialogId || undefined}
            isTyping={isTyping}
            isLoading={isLoadingHistory}
            autoScroll={true}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={loadMoreMessages}
          />
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-0">
            <div className="text-center mb-8">
              <h1 className="text-h2 mb-2">Hey! How can I help?</h1>
              <p className="text-h4 text-ods-text-secondary">Describe what's happening and I'll take a look.</p>
            </div>

            {flags.tickets ? (
              <>
                {/* Tickets List */}
                <ChatTicketList className="w-full max-w-2xl" tickets={displayTickets} onTicketClick={handleTicketClick} />

                {/* Quick Actions — shown only when no tickets */}
                {displayTickets.length === 0 && quickActions.length > 0 && (
                  <div className="w-full max-w-2xl">
                    <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">Quick Help</h3>
                    <div className="space-y-1">
                      {quickActions.map(action => (
                        <ChatQuickAction
                          className="bg-ods-card"
                          key={action.id}
                          text={action.text}
                          onAction={handleQuickAction}
                          disabled={isDisconnected}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Resumable Dialog */}
                {resumableDialog && (
                  <div className="w-full max-w-2xl mb-6">
                    <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">
                      Resume Previous Conversation
                    </h3>
                    <div
                      className="p-4 bg-ods-card rounded-lg border border-ods-border hover:bg-ods-bg-hover transition-colors cursor-pointer"
                      onClick={async () => {
                        const success = await resumeDialog(resumableDialog.id);
                        if (success) {
                          setResumableDialog(null);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="flex gap-2 text-ods-text-primary font-medium">
                          <ClockHistoryIcon />
                          Last Topic: {resumableDialog.title || 'Untitled Conversation'}
                        </h4>
                        <span className="text-xs text-ods-text-secondary">
                          {new Date(resumableDialog.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex text-ods-text-secondary">Would you like to continue?</div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {quickActions.length > 0 && (
                  <div className="w-full max-w-2xl">
                    <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">Quick Help</h3>
                    <div className="space-y-1">
                      {quickActions.map(action => (
                        <ChatQuickAction
                          className="bg-ods-card"
                          key={action.id}
                          text={action.text}
                          onAction={handleQuickAction}
                          disabled={isDisconnected}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </ChatContent>

      <ChatFooter>
        <ChatInput
          onSend={sendMessage}
          onStop={flags['dialog-stop'] && isStreaming ? stopGeneration : undefined}
          sending={isStreaming}
          awaitingResponse={isTicketPreview || awaitingTechnicianResponse}
          placeholder="Enter your request here..."
          className={hasMessages ? '' : 'max-w-2xl mx-auto'}
          reserveAvatarOffset={hasMessages}
          disabled={isDisconnected}
        />
        {displayModel && isFullyLoaded && (
          <div className={hasMessages ? 'mx-auto w-full max-w-3xl px-4' : 'mx-auto w-full max-w-2xl'}>
            {hasMessages ? (
              <div className="grid grid-cols-[32px_1fr] gap-4 mt-3">
                <div className="invisible h-8 w-8" aria-hidden />
                <ModelDisplay
                  provider={displayModel.provider}
                  modelName={displayModel.modelName}
                  displayName={supportedModelsService.getModelDisplayName(displayModel.modelName)}
                />
              </div>
            ) : (
              <div className="mt-3">
                <ModelDisplay
                  provider={displayModel.provider}
                  modelName={displayModel.modelName}
                  displayName={supportedModelsService.getModelDisplayName(displayModel.modelName)}
                />
              </div>
            )}
          </div>
        )}
      </ChatFooter>
    </ChatContainer>
  );
}
